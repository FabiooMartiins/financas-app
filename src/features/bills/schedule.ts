// Em quais meses cada conta (a pagar ou a receber) aparece, quando vence e qual a situação — RF-17 a RF-21, RN-04.
import { daysBetween, daysInMonth, parseISODate, toISODate, today } from '@/lib/dates';
import type { Bill, BillAmountOverride, BillPayment } from './api';

export type BillStatus = 'paid' | 'overdue' | 'due-soon' | 'upcoming';

export interface BillOccurrence {
  bill: Bill;
  month: Date; // dia 1 do mês de referência
  dueDate: string; // aaaa-mm-dd
  /** "3/10" quando parcelada (RF-21) */
  installment: string | null;
  payment: BillPayment | null;
  /** Valor deste mês: o valor definido só para ele ou o valor padrão da conta */
  amountCents: number;
  /** true quando este mês tem um valor próprio (ex.: luz e água variam todo mês) */
  customAmount: boolean;
  status: BillStatus;
  /** Dias até o vencimento (negativo = atrasada) */
  daysLeft: number;
}

function monthIndex(date: Date) {
  return date.getFullYear() * 12 + date.getMonth();
}

/** Número da ocorrência (1 = mês de início) ou null se a conta não cai neste mês. */
function occurrenceNumber(bill: Bill, month: Date): number | null {
  if (!bill.is_active) return null;
  const start = parseISODate(bill.starts_on);
  const diff = monthIndex(month) - monthIndex(start);
  if (diff < 0) return null;
  if (bill.frequency === 'once') return diff === 0 ? 1 : null;
  if (bill.frequency === 'yearly') {
    if (diff % 12 !== 0) return null;
    return diff / 12 + 1;
  }
  if (bill.installments_total !== null && diff >= bill.installments_total) return null;
  return diff + 1;
}

/** Vencimento no mês; dia 31 vira o último dia em meses mais curtos. */
export function dueDateIn(bill: Bill, month: Date): string {
  const day = Math.min(bill.due_day, daysInMonth(month));
  return toISODate(new Date(month.getFullYear(), month.getMonth(), day));
}

export function occurrencesForMonth(bills: Bill[], payments: BillPayment[], month: Date, overrides: BillAmountOverride[] = []): BillOccurrence[] {
  const todayIso = today();
  const monthIso = toISODate(month);
  const result: BillOccurrence[] = [];

  for (const bill of bills) {
    const n = occurrenceNumber(bill, month);
    if (n === null) continue;
    const dueDate = dueDateIn(bill, month);
    const payment = payments.find((p) => p.bill_id === bill.id && p.reference_month === monthIso) ?? null;
    const daysLeft = daysBetween(todayIso, dueDate);
    const override = overrides.find((v) => v.bill_id === bill.id && v.reference_month === monthIso);

    let status: BillStatus;
    if (payment) status = 'paid';
    else if (daysLeft < 0) status = 'overdue'; // RN-04
    else if (daysLeft <= bill.remind_days_before) status = 'due-soon'; // RF-20
    else status = 'upcoming';

    result.push({
      bill,
      month,
      dueDate,
      installment: bill.installments_total !== null ? `${n}/${bill.installments_total}` : null,
      payment,
      amountCents: override?.amount_cents ?? bill.amount_cents,
      customAmount: !!override,
      status,
      daysLeft,
    });
  }

  return result.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function describeDue(o: BillOccurrence): string {
  if (o.bill.kind === 'income') {
    if (o.status === 'paid') return 'Recebido';
    if (o.daysLeft < -1) return `Atrasado há ${-o.daysLeft} dias`;
    if (o.daysLeft === -1) return 'Era para ontem';
    if (o.daysLeft === 0) return 'Previsto para hoje';
    if (o.daysLeft === 1) return 'Amanhã';
    return `Em ${o.daysLeft} dias`;
  }
  if (o.status === 'paid') return 'Paga';
  if (o.daysLeft < -1) return `Venceu há ${-o.daysLeft} dias`;
  if (o.daysLeft === -1) return 'Venceu ontem';
  if (o.daysLeft === 0) return 'Vence hoje';
  if (o.daysLeft === 1) return 'Vence amanhã';
  return `Vence em ${o.daysLeft} dias`;
}
