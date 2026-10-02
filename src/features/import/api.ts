import { supabase } from '@/lib/supabase';
import type { TransactionInput } from '@/features/transactions/api';

export interface ExistingTransaction {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  amount_cents: number;
  occurred_on: string;
  account_id: string;
  transfer_account_id: string | null;
  external_id: string | null;
}

/** Transações que já mexem na conta no período do arquivo (para achar duplicadas). */
export async function listAccountTransactions(accountId: string, start: string, end: string): Promise<ExistingTransaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('id, type, amount_cents, occurred_on, account_id, transfer_account_id, external_id')
    .or(`account_id.eq.${accountId},transfer_account_id.eq.${accountId}`)
    .gte('occurred_on', start)
    .lte('occurred_on', end)
    .limit(5000);
  if (error) throw error;
  return data;
}

/** Descrições já categorizadas, mais recentes primeiro (para sugerir a categoria). */
export async function listCategoryHistory(): Promise<{ description: string; category_id: string }[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('description, category_id')
    .not('category_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(3000);
  if (error) throw error;
  return data as { description: string; category_id: string }[];
}

/** Quais destes external_id já existem (em qualquer data). */
export async function findExistingExternalIds(externalIds: string[]): Promise<Set<string>> {
  const found = new Set<string>();
  for (let i = 0; i < externalIds.length; i += 100) {
    const { data, error } = await supabase.from('transactions').select('external_id').in('external_id', externalIds.slice(i, i + 100));
    if (error) throw error;
    for (const row of data) if (row.external_id) found.add(row.external_id);
  }
  return found;
}

/**
 * RNF-13: external_id único por usuário; reimportar o mesmo lançamento é ignorado.
 * Retorna quantas transações foram gravadas de fato.
 */
export async function insertImported(rows: (TransactionInput & { external_id: string })[]): Promise<number> {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const { data, error } = await supabase
      .from('transactions')
      .upsert(rows.slice(i, i + 500), { onConflict: 'user_id,external_id', ignoreDuplicates: true })
      .select('id');
    if (error) throw error;
    inserted += data.length;
  }
  return inserted;
}
