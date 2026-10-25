import { supabase } from '@/lib/supabase';
import type { InvestmentMovement } from './returns';

/** Todas as movimentações das contas de investimento (inclusive transferências que entram nelas). */
export async function listInvestmentMovements(accountIds: string[]): Promise<InvestmentMovement[]> {
  if (accountIds.length === 0) return [];
  const ids = accountIds.join(',');
  const rows: InvestmentMovement[] = [];
  const pageSize = 1000;
  for (let page = 0; ; page++) {
    const { data, error } = await supabase
      .from('transactions')
      .select('type, nature, amount_cents, occurred_on, account_id, transfer_account_id')
      .or(`account_id.in.(${ids}),transfer_account_id.in.(${ids})`)
      .order('occurred_on')
      .range(page * pageSize, page * pageSize + pageSize - 1);
    if (error) throw error;
    rows.push(...(data as InvestmentMovement[]));
    if (data.length < pageSize) return rows;
  }
}
