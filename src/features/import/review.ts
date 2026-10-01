// Revisão da importação: o que é novo, o que já existe no app e a categoria/tipo sugeridos.
import type { Account } from '@/features/accounts/api';
import type { Category } from '@/features/categories/api';
import { daysBetween } from '@/lib/dates';
import type { ExistingTransaction } from './api';
import type { StatementEntry } from './parsers';

export type RowStatus = 'new' | 'duplicate' | 'imported';
export type RowType = 'expense' | 'income' | 'transfer';

export interface ReviewRow {
  key: string;
  entry: StatementEntry;
  externalId: string;
  status: RowStatus;
  selected: boolean;
  type: RowType;
  categoryId: string;
  /** Transferência: a outra conta (destino se saiu desta conta, origem se entrou) */
  otherAccountId: string;
}

/** Texto para comparar descrições: sem acentos, números, parcelas e pontuação. */
export function descriptionKey(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\(\d+\/\d+\)|parcela \d+\/\d+|\d+\/\d+/g, ' ')
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// RN-02: pagamento de fatura é transferência entre contas próprias
const invoicePayment = /pagamento.*(fatura|cartao|recebido)|pgto.*(fat|cartao)|pag(to)?\.? ?fat|fatura.*(cartao|pag)/;

export function buildReview(params: {
  entries: StatementEntry[];
  account: Account;
  accounts: Account[];
  existing: ExistingTransaction[];
  history: { description: string; category_id: string }[];
  categories: Category[];
}): ReviewRow[] {
  const { entries, account, accounts, existing, history, categories } = params;

  // Categoria mais recente usada para cada descrição, separada por tipo
  const kindOf = new Map(categories.map((c) => [c.id, c.kind]));
  const suggested = new Map<string, string>();
  for (const h of history) {
    const kind = kindOf.get(h.category_id);
    const key = `${kind}|${descriptionKey(h.description)}`;
    if (kind && !suggested.has(key)) suggested.set(key, h.category_id);
  }

  const importedIds = new Set(existing.map((t) => t.external_id).filter(Boolean));
  // Transações do app ainda não "casadas" com uma linha do arquivo
  const unmatched = [...existing];
  const signedFor = (t: ExistingTransaction) =>
    t.type === 'income' || (t.type === 'transfer' && t.transfer_account_id === account.id) ? t.amount_cents : -t.amount_cents;

  const defaultOther =
    account.type === 'credit_card'
      ? accounts.find((a) => a.is_active && a.type === 'checking') ?? accounts.find((a) => a.is_active && a.type !== 'credit_card')
      : accounts.find((a) => a.is_active && a.type === 'credit_card');

  // ID do banco só serve se for único no arquivo; senão usa data + valor + descrição
  const idCount = new Map<string, number>();
  for (const e of entries) if (e.bankId) idCount.set(e.bankId, (idCount.get(e.bankId) ?? 0) + 1);

  const seen = new Map<string, number>();
  return entries.map((entry, index) => {
    let externalId: string;
    if (entry.bankId && idCount.get(entry.bankId) === 1) {
      externalId = `imp:${account.id}:${entry.bankId}`;
    } else {
      // Ordem no arquivo diferencia compras iguais no mesmo dia
      const base = `imp:${account.id}:${entry.date}:${entry.amountCents}:${descriptionKey(entry.description).slice(0, 40)}`;
      const n = (seen.get(base) ?? 0) + 1;
      seen.set(base, n);
      externalId = `${base}:${n}`;
    }

    let status: RowStatus = 'new';
    if (importedIds.has(externalId)) {
      status = 'imported';
      unmatched.splice(
        unmatched.findIndex((t) => t.external_id === externalId),
        1,
      );
    } else {
      // Mesmo valor e sentido, até 3 dias de diferença: provavelmente já foi lançado à mão
      const match = unmatched.findIndex(
        (t) => signedFor(t) === entry.amountCents && Math.abs(daysBetween(t.occurred_on, entry.date)) <= 3,
      );
      if (match >= 0) {
        status = 'duplicate';
        unmatched.splice(match, 1);
      }
    }

    const isPayment = invoicePayment.test(descriptionKey(entry.description)) && defaultOther !== undefined;
    const type: RowType = isPayment ? 'transfer' : entry.amountCents < 0 ? 'expense' : 'income';
    const categoryId = type === 'transfer' ? '' : suggested.get(`${type}|${descriptionKey(entry.description)}`) ?? '';

    return {
      key: `${index}`,
      entry,
      externalId,
      status,
      selected: status === 'new',
      type,
      categoryId,
      otherAccountId: isPayment ? defaultOther!.id : '',
    };
  });
}
