import { supabase } from '@/lib/supabase';
import { toISODate } from '@/lib/dates';
import type { Database } from '@/types/database';

export type BillFrequency = Database['public']['Enums']['bill_frequency'];

export interface Bill {
  id: string;
  name: string;
  amount_cents: number;
  due_day: number;
  frequency: BillFrequency;
  category_id: string | null;
  account_id: string | null;
  remind_days_before: number;
  installments_total: number | null;
  starts_on: string;
  is_active: boolean;
  category: { id: string; name: string; color: string } | null;
  account: { id: string; name: string } | null;
}

export interface BillPayment {
  bill_id: string;
  reference_month: string;
  transaction_id: string | null;
  paid_at: string;
  transaction: { occurred_on: string; account: { name: string } | null } | null;
}

export type BillInput = Omit<Bill, 'id' | 'category' | 'account'>;

// RF-17
export async function listBills(): Promise<Bill[]> {
  const { data, error } = await supabase
    .from('bills')
    .select(
      'id, name, amount_cents, due_day, frequency, category_id, account_id, remind_days_before, installments_total, starts_on, is_active, ' +
        'category:categories(id, name, color), account:accounts(id, name)',
    )
    .order('due_day');
  if (error) throw error;
  return data as unknown as Bill[];
}

/** Pagamentos dos meses entre first e last (dia 1 de cada mês) */
export async function listPayments(first: Date, last: Date): Promise<BillPayment[]> {
  const { data, error } = await supabase
    .from('bill_payments')
    .select('bill_id, reference_month, transaction_id, paid_at, transaction:transactions(occurred_on, account:accounts!transactions_account_id_fkey(name))')
    .gte('reference_month', toISODate(first))
    .lte('reference_month', toISODate(last));
  if (error) throw error;
  return data as unknown as BillPayment[];
}

export async function createBill(input: BillInput) {
  const { data, error } = await supabase.from('bills').insert(input).select('id').single();
  if (error) throw error;
  return data.id;
}

export async function updateBill(id: string, input: BillInput) {
  const { error } = await supabase.from('bills').update(input).eq('id', id);
  if (error) throw error;
}

/** Os pagamentos saem junto; as transações já geradas continuam no histórico. */
export async function deleteBill(id: string) {
  const { error } = await supabase.from('bills').delete().eq('id', id);
  if (error) throw error;
}

// RF-18, RN-03: gera a transação de despesa e registra o pagamento (atômico, no banco)
export async function payBill(billId: string, referenceMonth: Date, accountId: string, paidOn: string) {
  const { error } = await supabase.rpc('pay_bill', {
    p_bill_id: billId,
    p_reference_month: toISODate(referenceMonth),
    p_account_id: accountId,
    p_paid_on: paidOn,
  });
  if (error) throw error;
}

// RN-03: desmarcar remove a transação gerada
export async function unpayBill(billId: string, referenceMonth: Date) {
  const { error } = await supabase.rpc('unpay_bill', {
    p_bill_id: billId,
    p_reference_month: toISODate(referenceMonth),
  });
  if (error) throw error;
}
