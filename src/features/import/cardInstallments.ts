// Parcelas na fatura importada do cartão. Muitos bancos mandam "Loja - Parcela 2/5" com a data da
// compra original: sem ajuste, todas as parcelas cairiam no mês da compra. Aqui cada parcela vai
// para a fatura do arquivo, como o app faz nas compras parceladas lançadas à mão (RF-21).
import { invoiceMonthFor, type CardSettings } from '@/features/cards/invoices';
import { addMonthsKeepDay } from '@/lib/dates';
import type { StatementEntry } from './parsers';

type CardCycle = Pick<CardSettings, 'closing_day'>;

const patterns = [
  /^(.*?)[\s\-–]*\bparc(?:ela)?\.?\s*(\d{1,2})\s*(?:\/|de)\s*(\d{1,2})\b.*$/i, // "Loja - Parcela 2/5", "LOJA PARC 02 DE 05"
  /^(.*?)\s*\((\d{1,2})\/(\d{1,2})\)\s*$/, // "Loja (2/5)"
  /^(.*?)\s+(\d{2})\/(\d{2})\s*$/, // "LOJA 02/05"
];

export function bankInstallment(description: string): { base: string; number: number; total: number } | null {
  for (const pattern of patterns) {
    const match = pattern.exec(description);
    if (!match) continue;
    const number = Number(match[2]);
    const total = Number(match[3]);
    const base = match[1].replace(/[\s\-–]+$/, '').trim();
    if (base && number >= 1 && total >= 2 && total <= 48 && number <= total) return { base, number, total };
  }
  return null;
}

export function alignCardInstallments(entries: StatementEntry[], card: CardCycle): StatementEntry[] {
  const invoiceIndex = (date: string) => {
    const { year, month } = invoiceMonthFor(card, date);
    return year * 12 + month;
  };

  // Fatura do arquivo: a mais comum entre os lançamentos que não são parcelas antigas
  const counts = new Map<number, number>();
  for (const e of entries) {
    if ((bankInstallment(e.description)?.number ?? 1) > 1) continue;
    const index = invoiceIndex(e.date);
    counts.set(index, (counts.get(index) ?? 0) + 1);
  }
  const main =
    [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]?.[0] ?? Math.max(...entries.map((e) => invoiceIndex(e.date)));

  return entries.map((entry) => {
    const installment = bankInstallment(entry.description);
    if (!installment) return entry;
    const description = `${installment.base} (${installment.number}/${installment.total})`;
    const shift = main - invoiceIndex(entry.date);
    // Só move parcelas que ficaram para trás, no máximo o número de meses que a parcela permite
    if (installment.number > 1 && shift > 0 && shift <= installment.number) {
      return { ...entry, description, date: addMonthsKeepDay(entry.date, shift), bankDate: entry.date };
    }
    return { ...entry, description };
  });
}
