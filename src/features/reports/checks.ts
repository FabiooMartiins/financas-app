// Conferência dos relatórios: lançamentos que provavelmente inflam os totais do mês.
import { looksLikeInvoicePayment } from '@/features/cards/invoicePayment';
import { daysBetween, monthRange } from '@/lib/dates';
import { classify, type Movement } from './api';

export interface ReportIssues {
  /** Pagamento de fatura lançado como despesa (conta) ou receita (cartão): conta em dobro (RN-02) */
  payments: Movement[];
  /** Mesmo lançamento feito à mão e importado do extrato */
  duplicates: { manual: Movement; imported: Movement }[];
  uncategorized: { count: number; cents: number };
}

const isImported = (m: Movement) => m.external_id?.startsWith('imp:') ?? false;

export function findIssues(movements: Movement[], month: Date, cardIds: Set<string>): ReportIssues {
  const { start, end } = monthRange(month);
  const inMonth = movements.filter((m) => m.occurred_on >= start && m.occurred_on <= end);

  const payments =
    cardIds.size === 0
      ? []
      : inMonth.filter(
          (m) =>
            looksLikeInvoicePayment(m.description) &&
            ((m.type === 'expense' && !cardIds.has(m.account_id)) || (m.type === 'income' && cardIds.has(m.account_id))),
        );
  const paymentIds = new Set(payments.map((m) => m.id));

  // Mesmo valor, tipo e conta, até 3 dias de diferença, um manual e outro importado
  const duplicates: ReportIssues['duplicates'] = [];
  const used = new Set<string>();
  const manual = inMonth.filter((m) => !isImported(m));
  for (const imported of inMonth.filter(isImported)) {
    const match = manual.find(
      (m) =>
        !used.has(m.id) &&
        m.account_id === imported.account_id &&
        m.type === imported.type &&
        m.amount_cents === imported.amount_cents &&
        Math.abs(daysBetween(m.occurred_on, imported.occurred_on)) <= 3,
    );
    if (match) {
      used.add(match.id);
      duplicates.push({ manual: match, imported });
    }
  }

  const uncategorized = inMonth.filter((m) => {
    const { kind, cents } = classify(m, cardIds);
    return kind === 'expense' && cents > 0 && !m.category_id && !paymentIds.has(m.id);
  });

  return {
    payments,
    duplicates,
    uncategorized: { count: uncategorized.length, cents: uncategorized.reduce((s, m) => s + m.amount_cents, 0) },
  };
}
