// Faturas do cartão de crédito, calculadas a partir das transações (RN-02):
// - compra entra na fatura pelo dia da compra; a partir do dia do fechamento vai para a seguinte;
// - pagamento de fatura é transferência para o cartão e abate primeiro a fatura mais antiga.
import { daysInMonth, parseISODate, toISODate } from '@/lib/dates';

export interface CardSettings {
  id: string;
  name: string;
  closing_day: number;
  due_day: number;
  credit_limit_cents: number | null;
  /** Saldo inicial: negativo = fatura que já estava em aberto no cadastro */
  balance_cents: number;
  created_at: string;
}

export interface CardMovement {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  amount_cents: number;
  occurred_on: string;
  description: string;
  account_id: string;
  transfer_account_id: string | null;
  source: 'manual' | 'bank';
  card_name: string | null;
  category: { name: string; color: string } | null;
}

export type InvoiceStatus = 'future' | 'open' | 'closed' | 'overdue' | 'paid';

export interface InvoiceItem {
  id: string | null; // null = saldo inicial do cadastro
  description: string;
  occurred_on: string;
  /** Positivo = compra; negativo = estorno/crédito */
  amount_cents: number;
  /** Qual dos cartões (Físico, Virtual, Adicional…), quando informado */
  card_name: string | null;
  category: { name: string; color: string } | null;
}

export interface Invoice {
  key: string; // aaaa-mm do fechamento
  cardId: string;
  cardName: string;
  startDate: string; // primeiro dia de compras desta fatura
  closingDate: string; // a partir deste dia, compras vão para a próxima
  dueDate: string;
  items: InvoiceItem[];
  total: number;
  paid: number;
  remaining: number;
  status: InvoiceStatus;
}

function dateIn(year: number, month: number, day: number): string {
  const first = new Date(year, month, 1);
  return toISODate(new Date(year, month, Math.min(day, daysInMonth(first))));
}

/** Data de fechamento da fatura que fecha no mês (year, month). */
export function closingDate(card: Pick<CardSettings, 'closing_day'>, year: number, month: number): string {
  return dateIn(year, month, card.closing_day);
}

/** Vencimento: no mesmo mês do fechamento, ou no seguinte se o dia for menor ou igual ao fechamento. */
export function dueDate(card: Pick<CardSettings, 'closing_day' | 'due_day'>, year: number, month: number): string {
  return card.due_day > card.closing_day ? dateIn(year, month, card.due_day) : dateIn(year, month + 1, card.due_day);
}

/** Mês (ano, mês) do fechamento da fatura em que cai uma compra feita em `isoDate`. */
export function invoiceMonthFor(card: Pick<CardSettings, 'closing_day'>, isoDate: string): { year: number; month: number } {
  const d = parseISODate(isoDate);
  const closing = closingDate(card, d.getFullYear(), d.getMonth());
  if (isoDate < closing) return { year: d.getFullYear(), month: d.getMonth() };
  const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return { year: next.getFullYear(), month: next.getMonth() };
}

const keyOf = (year: number, month: number) => `${year}-${String(month + 1).padStart(2, '0')}`;

export function buildInvoices(card: CardSettings, movements: CardMovement[], todayIso: string): Invoice[] {
  const items = new Map<string, InvoiceItem[]>();
  let payments = 0;

  const addToKey = (key: string, item: InvoiceItem) => items.set(key, [...(items.get(key) ?? []), item]);
  const addItem = (date: string, item: InvoiceItem) => {
    const { year, month } = invoiceMonthFor(card, date);
    addToKey(keyOf(year, month), item);
  };

  // Data local do cadastro (created_at vem em UTC)
  const createdOn = toISODate(new Date(card.created_at));
  if (card.balance_cents < 0) {
    // O que já estava gasto no cadastro vai para a próxima fatura a vencer — que pode
    // ser uma já fechada (cadastro entre o fechamento e o vencimento)
    let { year, month } = invoiceMonthFor(card, createdOn);
    while (dueDate(card, year, month - 1) >= createdOn) {
      const prev = new Date(year, month - 1, 1);
      year = prev.getFullYear();
      month = prev.getMonth();
    }
    addToKey(keyOf(year, month), {
      id: null,
      description: 'Em aberto no cadastro do cartão',
      occurred_on: createdOn,
      amount_cents: -card.balance_cents,
      card_name: null,
      category: null,
    });
  } else if (card.balance_cents > 0) {
    payments += card.balance_cents; // crédito no cartão abate as próximas faturas
  }

  for (const m of movements) {
    const base = { id: m.id, description: m.description, occurred_on: m.occurred_on, card_name: m.card_name, category: m.category };
    if (m.type === 'transfer' && m.transfer_account_id === card.id) payments += m.amount_cents; // pagamento de fatura
    else if (m.account_id !== card.id) continue;
    else if (m.type === 'expense') addItem(m.occurred_on, { ...base, amount_cents: m.amount_cents });
    else if (m.type === 'income') addItem(m.occurred_on, { ...base, amount_cents: -m.amount_cents }); // estorno
    else if (m.type === 'transfer') addItem(m.occurred_on, { ...base, amount_cents: m.amount_cents }); // saque/transferência a partir do cartão
  }

  // Garante a fatura aberta de hoje, mesmo vazia, e preenche meses sem compras entre a primeira e a última
  const current = invoiceMonthFor(card, todayIso);
  const keys = [...items.keys(), keyOf(current.year, current.month)].sort();
  const [firstYear, firstMonth] = keys[0].split('-').map(Number);
  const [lastYear, lastMonth] = keys[keys.length - 1].split('-').map(Number);

  const invoices: Invoice[] = [];
  let owedBefore = 0;
  for (let i = 0; ; i++) {
    const at = new Date(firstYear, firstMonth - 1 + i, 1);
    const year = at.getFullYear();
    const month = at.getMonth();
    if (year * 12 + month > lastYear * 12 + lastMonth - 1) break;

    const list = (items.get(keyOf(year, month)) ?? []).sort((a, b) => a.occurred_on.localeCompare(b.occurred_on));
    const total = list.reduce((s, it) => s + it.amount_cents, 0);
    const charged = Math.max(total, 0);
    const remaining = Math.min(Math.max(owedBefore + total - payments, 0), charged);
    owedBefore += total;

    const prev = new Date(year, month - 1, 1);
    const startDate = closingDate(card, prev.getFullYear(), prev.getMonth());
    const closing = closingDate(card, year, month);
    const due = dueDate(card, year, month);

    let status: InvoiceStatus;
    if (todayIso < startDate) status = 'future';
    else if (todayIso < closing) status = 'open';
    else if (remaining === 0) status = 'paid';
    else if (todayIso > due) status = 'overdue';
    else status = 'closed';

    invoices.push({
      key: keyOf(year, month),
      cardId: card.id,
      cardName: card.name,
      startDate,
      closingDate: closing,
      dueDate: due,
      items: list,
      total,
      paid: charged - remaining,
      remaining,
      status,
    });
  }

  return invoices;
}

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  future: 'Futura',
  open: 'Aberta',
  closed: 'Fechada',
  overdue: 'Vencida',
  paid: 'Paga',
};
