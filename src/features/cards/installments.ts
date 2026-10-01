// Compras parceladas no cartão (RF-21): cada parcela é uma transação com "(n/N)" no fim da descrição.
import { addMonthsKeepDay } from '@/lib/dates';
import type { Invoice, InvoiceItem } from './invoices';

const installmentPattern = /\s*\((\d+)\/(\d+)\)$/;

/** "Geladeira (3/10)" -> { base: 'Geladeira', number: 3, total: 10 } */
export function parseInstallment(description: string): { base: string; number: number; total: number } | null {
  const match = installmentPattern.exec(description);
  if (!match) return null;
  const number = Number(match[1]);
  const total = Number(match[2]);
  if (number < 1 || total < 2 || number > total) return null;
  return { base: description.slice(0, match.index), number, total };
}

export interface InstallmentPurchase {
  key: string;
  description: string;
  purchasedOn: string;
  count: number;
  /** Parcelas já cobradas em faturas fechadas */
  billed: number;
  totalCents: number;
  remainingCents: number;
  /** Fatura em que cai a última parcela */
  lastInvoice: Invoice;
}

/** Compras parceladas que ainda têm parcelas em faturas abertas ou futuras. */
export function ongoingInstallments(invoices: Invoice[]): InstallmentPurchase[] {
  const groups = new Map<string, { info: NonNullable<ReturnType<typeof parseInstallment>>; item: InvoiceItem; invoice: Invoice }[]>();
  for (const invoice of invoices) {
    for (const item of invoice.items) {
      const info = item.id ? parseInstallment(item.description) : null;
      if (!info) continue;
      // Mesma descrição pode ser compras diferentes: separa pela data da 1ª parcela
      const purchasedOn = addMonthsKeepDay(item.occurred_on, -(info.number - 1));
      const key = `${info.base}|${info.total}|${purchasedOn}`;
      groups.set(key, [...(groups.get(key) ?? []), { info, item, invoice }]);
    }
  }

  const result: InstallmentPurchase[] = [];
  for (const [key, parts] of groups) {
    const pending = parts.filter((p) => p.invoice.status === 'open' || p.invoice.status === 'future');
    if (pending.length === 0) continue;
    const last = parts.reduce((a, b) => (b.item.occurred_on > a.item.occurred_on ? b : a));
    result.push({
      key,
      description: parts[0].info.base,
      purchasedOn: key.split('|')[2],
      count: parts[0].info.total,
      billed: parts.length - pending.length,
      totalCents: parts.reduce((s, p) => s + p.item.amount_cents, 0),
      remainingCents: pending.reduce((s, p) => s + p.item.amount_cents, 0),
      lastInvoice: last.invoice,
    });
  }
  return result.sort((a, b) => a.lastInvoice.dueDate.localeCompare(b.lastInvoice.dueDate) || a.description.localeCompare(b.description));
}
