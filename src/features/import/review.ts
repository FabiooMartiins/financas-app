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

/**
 * external_id de cada lançamento do arquivo. Muitos bancos reaproveitam o ID (FITID) entre arquivos
 * (numeram 1, 2, 3… a cada exportação), então o ID sozinho não basta: vai junto com data e valor.
 * Sem ID (ou ID repetido no arquivo): data + valor + descrição + ordem, para compras iguais no mesmo dia.
 */
export function importExternalIds(entries: StatementEntry[], accountId: string): string[] {
  const idCount = new Map<string, number>();
  for (const e of entries) if (e.bankId) idCount.set(e.bankId, (idCount.get(e.bankId) ?? 0) + 1);

  const seen = new Map<string, number>();
  return entries.map((entry) => {
    if (entry.bankId && idCount.get(entry.bankId) === 1) return `imp:${accountId}:${entry.bankId}:${entry.date}:${entry.amountCents}`;
    const base = `imp:${accountId}:${entry.date}:${entry.amountCents}:${descriptionKey(entry.description).slice(0, 40)}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return `${base}:${n}`;
  });
}

// RN-02: pagamento de fatura é transferência entre contas próprias
const invoicePayment = /pagamento.*(fatura|cartao|recebido)|pgto.*(fat|cartao)|pag(to)?\.? ?fat|fatura.*(cartao|pag)/;

export function buildReview(params: {
  entries: StatementEntry[];
  account: Account;
  accounts: Account[];
  existing: ExistingTransaction[];
  /** external_id (de importExternalIds) que já estão gravados, em qualquer data */
  importedIds: Set<string>;
  history: { description: string; category_id: string }[];
  categories: Category[];
}): ReviewRow[] {
  const { entries, account, accounts, existing, importedIds, history, categories } = params;

  // Categoria mais recente usada para cada descrição, separada por tipo
  const kindOf = new Map(categories.map((c) => [c.id, c.kind]));
  const suggested = new Map<string, string>();
  for (const h of history) {
    const kind = kindOf.get(h.category_id);
    const key = `${kind}|${descriptionKey(h.description)}`;
    if (kind && !suggested.has(key)) suggested.set(key, h.category_id);
  }

  // Transações do app ainda não "casadas" com uma linha do arquivo
  const unmatched = [...existing];
  const signedFor = (t: ExistingTransaction) =>
    t.type === 'income' || (t.type === 'transfer' && t.transfer_account_id === account.id) ? t.amount_cents : -t.amount_cents;
  const consume = (index: number) => index >= 0 && unmatched.splice(index, 1);

  const defaultOther =
    account.type === 'credit_card'
      ? accounts.find((a) => a.is_active && a.type === 'checking') ?? accounts.find((a) => a.is_active && a.type !== 'credit_card')
      : accounts.find((a) => a.is_active && a.type === 'credit_card');

  const externalIds = importExternalIds(entries, account.id);
  return entries.map((entry, index) => {
    const externalId = externalIds[index];

    let status: RowStatus = 'new';
    // Formato antigo (só o ID do banco, sem data e valor): conta como importado se data e valor batem
    const legacy = entry.bankId
      ? unmatched.findIndex(
          (t) => t.external_id === `imp:${account.id}:${entry.bankId}` && t.occurred_on === entry.date && signedFor(t) === entry.amountCents,
        )
      : -1;
    if (importedIds.has(externalId) || legacy >= 0) {
      status = 'imported';
      consume(legacy >= 0 ? legacy : unmatched.findIndex((t) => t.external_id === externalId));
    } else {
      // Mesmo valor e sentido, até 3 dias de diferença: provavelmente já foi lançado à mão
      const match = unmatched.findIndex(
        (t) => signedFor(t) === entry.amountCents && Math.abs(daysBetween(t.occurred_on, entry.date)) <= 3,
      );
      if (match >= 0) {
        status = 'duplicate';
        consume(match);
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
