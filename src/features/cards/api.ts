import { supabase } from '@/lib/supabase';
import type { CardMovement } from './invoices';

/** Todas as movimentações dos cartões: compras/estornos neles e pagamentos para eles. */
export async function listCardMovements(cardIds: string[]): Promise<CardMovement[]> {
  if (cardIds.length === 0) return [];
  const ids = cardIds.join(',');
  const rows: CardMovement[] = [];
  const pageSize = 1000;
  for (let page = 0; ; page++) {
    const { data, error } = await supabase
      .from('transactions')
      .select('id, type, amount_cents, occurred_on, description, account_id, transfer_account_id, source, category:categories(name, color)')
      .or(`account_id.in.(${ids}),transfer_account_id.in.(${ids})`)
      .order('occurred_on')
      .order('created_at')
      .order('id') // desempate estável para a paginação (importação grava várias com o mesmo created_at)
      .range(page * pageSize, page * pageSize + pageSize - 1);
    if (error) throw error;
    rows.push(...(data as unknown as CardMovement[]));
    if (data.length < pageSize) return rows;
  }
}
