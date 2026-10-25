import { supabase } from '@/lib/supabase';
import { addMonths, formatMonthShort, monthRange, toISODate } from '@/lib/dates';
import type { Category } from '@/features/categories/api';

export interface Movement {
  id: string;
  type: 'income' | 'expense';
  amount_cents: number;
  occurred_on: string;
  category_id: string | null;
  account_id: string;
  description: string;
  external_id: string | null;
}

/**
 * Receitas e despesas de [from, to]. Transferências ficam de fora (RN-01, RN-02):
 * pagamento de fatura não é despesa; a compra no cartão já contou na data da compra.
 */
export async function listMovements(from: string, to: string): Promise<Movement[]> {
  const rows: Movement[] = [];
  const pageSize = 1000;
  for (let page = 0; ; page++) {
    const { data, error } = await supabase
      .from('transactions')
      .select('id, type, amount_cents, occurred_on, category_id, account_id, description, external_id')
      .in('type', ['income', 'expense'])
      .eq('nature', 'normal') // RN-10: sem rendimentos e ajustes de saldo
      .gte('occurred_on', from)
      .lte('occurred_on', to)
      // Ordem única (id desempata): sem ela a paginação repete ou pula linhas do mesmo dia
      .order('occurred_on')
      .order('id')
      .range(page * pageSize, page * pageSize + pageSize - 1);
    if (error) throw error;
    rows.push(...(data as Movement[]));
    if (data.length < pageSize) return rows;
  }
}

/**
 * Como a movimentação conta nos relatórios. Crédito no cartão (estorno, reembolso) abate as
 * despesas em vez de virar receita; pagamento de fatura é transferência e nem chega aqui (RN-02).
 */
export function classify(m: Movement, cardIds: Set<string>): { kind: 'income' | 'expense'; cents: number } {
  if (m.type === 'income' && cardIds.has(m.account_id)) return { kind: 'expense', cents: -m.amount_cents };
  return { kind: m.type, cents: m.amount_cents };
}

export interface MonthTotals {
  month: Date;
  label: string;
  income: number;
  expense: number;
}

export function totalsByMonth(movements: Movement[], lastMonth: Date, count: number, cardIds: Set<string>): MonthTotals[] {
  const byMonth = new Map<string, { income: number; expense: number }>();
  for (const m of movements) {
    const key = m.occurred_on.slice(0, 7);
    const totals = byMonth.get(key) ?? { income: 0, expense: 0 };
    const { kind, cents } = classify(m, cardIds);
    totals[kind] += cents;
    byMonth.set(key, totals);
  }
  return Array.from({ length: count }, (_, i) => {
    const month = addMonths(lastMonth, i - count + 1);
    const totals = byMonth.get(toISODate(month).slice(0, 7));
    const label = formatMonthShort(month);
    return {
      month,
      // Ano no rótulo quando o período atravessa a virada do ano ("dez/25", "jan/26")
      label: count > 1 && month.getMonth() === 0 ? `${label}/${String(month.getFullYear()).slice(2)}` : label,
      income: totals?.income ?? 0,
      expense: totals?.expense ?? 0,
    };
  });
}

export interface CategoryTotal {
  id: string | null;
  name: string;
  color: string;
  cents: number;
  share: number; // 0..1
}

/**
 * RF-23: total por categoria no mês; subcategorias somam na categoria principal.
 * Estorno no cartão abate a própria categoria (se for de despesa) ou entra em `refunds`.
 */
export function totalsByCategory(
  movements: Movement[],
  categories: Category[],
  month: Date,
  type: 'income' | 'expense',
  cardIds: Set<string>,
): { totals: CategoryTotal[]; refunds: number } {
  const { start, end } = monthRange(month);
  const byId = new Map(categories.map((c) => [c.id, c]));
  const totals = new Map<string | null, number>();
  let refunds = 0;

  for (const m of movements) {
    if (m.occurred_on < start || m.occurred_on > end) continue;
    const { kind, cents } = classify(m, cardIds);
    if (kind !== type) continue;
    const category = m.category_id ? byId.get(m.category_id) : undefined;
    if (cents < 0 && category?.kind !== 'expense') {
      refunds -= cents;
      continue;
    }
    const key = category?.parent_id ?? category?.id ?? null;
    totals.set(key, (totals.get(key) ?? 0) + cents);
  }

  const positive = [...totals.entries()].filter(([, cents]) => cents > 0);
  const sum = positive.reduce((s, [, v]) => s + v, 0);
  return {
    totals: positive
      .map(([id, cents]) => {
        const category = id ? byId.get(id) : undefined;
        return { id, name: category?.name ?? 'Sem categoria', color: category?.color ?? '#9AA39E', cents, share: sum ? cents / sum : 0 };
      })
      .sort((a, b) => b.cents - a.cents),
    refunds,
  };
}

/** Exporta as transações do período em CSV (abre no Excel/Numbers/Google Planilhas). */
export async function exportTransactionsCsv(from: string, to: string): Promise<Blob> {
  const { data, error } = await supabase
    .from('transactions')
    .select(
      'occurred_on, type, nature, description, amount_cents, source, ' +
        'account:accounts!transactions_account_id_fkey(name), transfer_account:accounts!transactions_transfer_account_id_fkey(name), category:categories(name)',
    )
    .gte('occurred_on', from)
    .lte('occurred_on', to)
    .order('occurred_on');
  if (error) throw error;

  const typeLabel = { income: 'Receita', expense: 'Despesa', transfer: 'Transferência' } as const;
  const rows = (data as unknown as {
    occurred_on: string;
    type: keyof typeof typeLabel;
    nature: 'normal' | 'adjustment' | 'yield';
    description: string;
    amount_cents: number;
    source: string;
    account: { name: string } | null;
    transfer_account: { name: string } | null;
    category: { name: string } | null;
  }[]).map((t) => [
    t.occurred_on.split('-').reverse().join('/'),
    t.nature === 'yield' ? 'Rendimento' : t.nature === 'adjustment' ? 'Ajuste de saldo' : typeLabel[t.type],
    t.description,
    (t.type === 'expense' ? -t.amount_cents / 100 : t.amount_cents / 100).toFixed(2).replace('.', ','),
    t.category?.name ?? '',
    t.account?.name ?? '',
    t.transfer_account?.name ?? '',
    t.source === 'bank' ? 'Banco' : 'Manual',
  ]);

  const header = ['Data', 'Tipo', 'Descrição', 'Valor (R$)', 'Categoria', 'Conta', 'Conta destino', 'Origem'];
  const escape = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  // ";" e BOM: o Excel em português abre direto com acentos e colunas certas
  const csv = [header, ...rows].map((r) => r.map(escape).join(';')).join('\r\n');
  return new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
}
