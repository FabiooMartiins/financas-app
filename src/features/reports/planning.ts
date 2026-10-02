// Planejamento do mês: quanto entra, quanto sai e a diferença, juntando o que já foi lançado
// com o que está previsto (contas a pagar/receber ainda não marcadas, faturas do cartão).
import type { BillOccurrence } from '@/features/bills/schedule';
import type { Invoice } from '@/features/cards/invoices';
import { formatDayMonth, monthRange } from '@/lib/dates';
import { classify, type Movement } from './api';

/**
 * - cash: o que entra e sai das contas; o cartão conta pela fatura que vence no mês.
 * - consumption: cada compra conta na data em que foi feita, inclusive no cartão (RN-02).
 */
export type PlanMode = 'cash' | 'consumption';

export interface PlanLine {
  label: string;
  cents: number;
  /** Ainda não aconteceu (previsto ou com data futura) */
  planned: boolean;
}

export interface MonthPlan {
  income: PlanLine[];
  expense: PlanLine[];
  totalIncome: number;
  totalExpense: number;
  /** Quanto do total já aconteceu */
  doneIncome: number;
  doneExpense: number;
}

export function buildPlan(params: {
  mode: PlanMode;
  month: Date;
  movements: Movement[];
  cardIds: Set<string>;
  occurrences: BillOccurrence[];
  invoices: Invoice[];
  todayIso: string;
}): MonthPlan {
  const { mode, month, movements, cardIds, occurrences, invoices, todayIso } = params;
  const { start, end } = monthRange(month);
  const isPast = end < todayIso;

  let incomeDone = 0;
  let incomeLater = 0;
  let expenseDone = 0;
  let expenseLater = 0;
  let refunds = 0;
  for (const m of movements) {
    if (m.occurred_on < start || m.occurred_on > end) continue;
    const onCard = cardIds.has(m.account_id);
    // Caixa: compras e estornos do cartão entram pela fatura, não aqui
    if (mode === 'cash' && onCard) continue;
    const { kind, cents } = classify(m, cardIds);
    const later = m.occurred_on > todayIso;
    if (kind === 'income') {
      if (later) incomeLater += cents;
      else incomeDone += cents;
    } else if (cents < 0) {
      refunds -= cents;
    } else if (later) {
      expenseLater += cents;
    } else {
      expenseDone += cents;
    }
  }

  // Contas do mês ainda não marcadas (as marcadas já viraram transação — RN-03)
  const open = occurrences.filter(
    (o) => o.status !== 'paid' && o.month.getFullYear() === month.getFullYear() && o.month.getMonth() === month.getMonth(),
  );
  const toReceive = open.filter((o) => o.bill.kind === 'income').reduce((s, o) => s + o.bill.amount_cents, 0);
  const toPay = open.filter((o) => o.bill.kind === 'expense').reduce((s, o) => s + o.bill.amount_cents, 0);

  const income: PlanLine[] = [
    { label: isPast ? 'Recebido' : 'Já recebido', cents: incomeDone, planned: false },
    { label: 'Lançado para os próximos dias', cents: incomeLater, planned: true },
    { label: isPast ? 'Recebimentos que não foram marcados' : 'A receber (previsto)', cents: toReceive, planned: true },
  ];

  const expense: PlanLine[] = [
    {
      label: mode === 'cash' ? (isPast ? 'Gasto em conta (débito, Pix, boleto)' : 'Já gasto em conta (débito, Pix, boleto)') : isPast ? 'Gasto' : 'Já gasto (inclui cartão)',
      cents: expenseDone,
      planned: false,
    },
    { label: mode === 'cash' ? 'Lançado para os próximos dias' : 'Parcelas e lançamentos dos próximos dias', cents: expenseLater, planned: true },
    { label: isPast ? 'Contas que não foram marcadas como pagas' : 'Contas a pagar', cents: toPay, planned: true },
  ];

  if (mode === 'cash') {
    // Fatura inteira que vence no mês: o pagamento é transferência e não aparece como despesa
    for (const invoice of invoices.filter((i) => i.dueDate >= start && i.dueDate <= end && i.total > 0)) {
      expense.push({
        label: `Fatura ${invoice.cardName} (vence ${formatDayMonth(invoice.dueDate)})${invoice.status === 'paid' ? ' · paga' : ''}`,
        cents: invoice.total,
        planned: invoice.status !== 'paid',
      });
    }
  } else if (refunds > 0) {
    expense.push({ label: 'Estornos e créditos no cartão', cents: -refunds, planned: false });
  }

  const sum = (lines: PlanLine[]) => lines.reduce((s, l) => s + l.cents, 0);
  return {
    income: income.filter((l) => l.cents !== 0),
    expense: expense.filter((l) => l.cents !== 0),
    totalIncome: sum(income),
    totalExpense: sum(expense),
    doneIncome: sum(income.filter((l) => !l.planned)),
    doneExpense: sum(expense.filter((l) => !l.planned)),
  };
}
