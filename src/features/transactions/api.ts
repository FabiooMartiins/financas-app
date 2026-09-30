import { supabase } from '@/lib/supabase';

export interface TransactionFilters {
  start: string; // aaaa-mm-dd
  end: string;
  accountId?: string;
  categoryId?: string;
  search?: string;
}

export async function listTransactions(filters: TransactionFilters) {
  let query = supabase
    .from('transactions')
    .select('id, type, amount_cents, description, occurred_on, source, account:accounts(id, name), category:categories(id, name, color)')
    .gte('occurred_on', filters.start)
    .lte('occurred_on', filters.end)
    .order('occurred_on', { ascending: false })
    .limit(50); // RNF-08: paginação

  if (filters.accountId) query = query.eq('account_id', filters.accountId);
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
  if (filters.search) query = query.ilike('description', `%${filters.search}%`);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}
