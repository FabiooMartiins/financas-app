import { supabase } from '@/lib/supabase';
import { addMonths, formatMonthShort, monthRange, toISODate } from '@/lib/dates';
import type { Category } from '@/features/categories/api';

interface Movement {
  type: 'income' | 'expense';
  amount_cents: number;
  occurred_on: string;
  category_id: string | null;
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
      .select('type, amount_cents, occurred_on, category_id')
      .in('type', ['income', 'expense'])
      .gte('occurred_on', from)
      .lte('occurred_on', to)
      .order('occurred_on')
      .range(page * pageSize, page * pageSize + pageSize - 1);
    if (error) throw error;
    rows.push(...(data as Movement[]));
    if (data.length < pageSize) return rows;
  }
}

export interface MonthTotals {
  month: Date;
  label: string;
  income: number;
  expense: number;
}

export function totalsByMonth(movements: Movement[], lastMonth: Date, count: number): MonthTotals[] {
  return Array.from({ length: count }, (_, i) => {
    const month = addMonths(lastMonth, i - count + 1);
    const prefix = toISODate(month).slice(0, 7);
    const inMonth = movements.filter((m) => m.occurred_on.startsWith(prefix));
    return {
      month,
      label: formatMonthShort(month),
      income: inMonth.filter((m) => m.type === 'income').reduce((s, m) => s + m.amount_cents, 0),
      expense: inMonth.filter((m) => m.type === 'expense').reduce((s, m) => s + m.amount_cents, 0),
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

/** RF-23: total por categoria no mês; subcategorias somam na categoria principal. */
export function totalsByCategory(movements: Movement[], categories: Category[], month: Date, type: 'income' | 'expense'): CategoryTotal[] {
  const { start, end } = monthRange(month);
  const byId = new Map(categories.map((c) => [c.id, c]));
  const totals = new Map<string | null, number>();

  for (const m of movements) {
    if (m.type !== type || m.occurred_on < start || m.occurred_on > end) continue;
    const category = m.category_id ? byId.get(m.category_id) : undefined;
    const key = category?.parent_id ?? category?.id ?? null;
    totals.set(key, (totals.get(key) ?? 0) + m.amount_cents);
  }

  const sum = [...totals.values()].reduce((s, v) => s + v, 0);
  return [...totals.entries()]
    .map(([id, cents]) => {
      const category = id ? byId.get(id) : undefined;
      return { id, name: category?.name ?? 'Sem categoria', color: category?.color ?? '#9AA39E', cents, share: sum ? cents / sum : 0 };
    })
    .sort((a, b) => b.cents - a.cents);
}

/** Exporta as transações do período em CSV (abre no Excel/Numbers/Google Planilhas). */
export async function exportTransactionsCsv(from: string, to: string): Promise<Blob> {
  const { data, error } = await supabase
    .from('transactions')
    .select(
      'occurred_on, type, description, amount_cents, source, ' +
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
    description: string;
    amount_cents: number;
    source: string;
    account: { name: string } | null;
    transfer_account: { name: string } | null;
    category: { name: string } | null;
  }[]).map((t) => [
    t.occurred_on.split('-').reverse().join('/'),
    typeLabel[t.type],
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
