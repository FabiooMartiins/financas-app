import { supabase } from '@/lib/supabase';
import { addMonthsKeepDay } from '@/lib/dates';
import type { Database } from '@/types/database';

export type TransactionType = Database['public']['Enums']['transaction_type'];

export const PAGE_SIZE = 50; // RNF-08: paginação

export interface TransactionFilters {
  start: string; // aaaa-mm-dd
  end: string;
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  search?: string;
}

const listColumns =
  'id, type, amount_cents, description, occurred_on, source, account_id, transfer_account_id, category_id, ' +
  'account:accounts!transactions_account_id_fkey(id, name), ' +
  'transfer_account:accounts!transactions_transfer_account_id_fkey(id, name), ' +
  'category:categories(id, name, color)';

export interface TransactionRow {
  id: string;
  type: TransactionType;
  amount_cents: number;
  description: string;
  occurred_on: string;
  source: 'manual' | 'bank';
  account_id: string;
  transfer_account_id: string | null;
  category_id: string | null;
  account: { id: string; name: string } | null;
  transfer_account: { id: string; name: string } | null;
  category: { id: string; name: string; color: string } | null;
}

// RF-11, RF-15: lista com busca e filtros, mais recentes primeiro
export async function listTransactions(filters: TransactionFilters, page = 0): Promise<TransactionRow[]> {
  let query = supabase
    .from('transactions')
    .select(listColumns)
    .gte('occurred_on', filters.start)
    .lte('occurred_on', filters.end)
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false }) // desempate estável entre páginas
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  // Filtrar por conta inclui transferências que entram nela
  if (filters.accountId) query = query.or(`account_id.eq.${filters.accountId},transfer_account_id.eq.${filters.accountId}`);
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
  if (filters.type) query = query.eq('type', filters.type);
  if (filters.search) query = query.ilike('description', `%${filters.search.replace(/[%_,()]/g, ' ')}%`);

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as TransactionRow[];
}

export async function getTransaction(id: string): Promise<TransactionRow> {
  const { data, error } = await supabase.from('transactions').select(listColumns).eq('id', id).single();
  if (error) throw error;
  return data as unknown as TransactionRow;
}

export interface TransactionInput {
  type: TransactionType;
  amount_cents: number;
  description: string;
  occurred_on: string;
  account_id: string;
  transfer_account_id: string | null;
  category_id: string | null;
}

export async function createTransaction(input: TransactionInput) {
  const { data, error } = await supabase.from('transactions').insert(input).select('id').single();
  if (error) throw error;
  return data.id;
}

/**
 * RF-21: compra parcelada. Gera uma transação por mês com "(1/N)" na descrição.
 * Os centavos que sobram da divisão vão na primeira parcela.
 */
export async function createInstallments(input: TransactionInput, installments: number) {
  const base = Math.floor(input.amount_cents / installments);
  const remainder = input.amount_cents - base * installments;
  const rows = Array.from({ length: installments }, (_, i) => ({
    ...input,
    amount_cents: base + (i === 0 ? remainder : 0),
    description: `${input.description} (${i + 1}/${installments})`,
    occurred_on: addMonthsKeepDay(input.occurred_on, i),
  }));
  const { error } = await supabase.from('transactions').insert(rows);
  if (error) throw error;
}

/** RN-05: em transações importadas o banco só aceita mudar categoria e descrição */
export async function updateTransaction(id: string, input: Partial<TransactionInput>) {
  const { error } = await supabase.from('transactions').update(input).eq('id', id);
  if (error) throw error;
}

export async function deleteTransaction(id: string) {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
}
