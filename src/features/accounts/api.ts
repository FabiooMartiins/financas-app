import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

export type AccountType = Database['public']['Enums']['account_type'];

export const accountTypeLabels: Record<AccountType, string> = {
  checking: 'Conta corrente',
  savings: 'Poupança',
  credit_card: 'Cartão de crédito',
  wallet: 'Carteira',
};

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  /** Saldo inicial (manual) ou saldo informado pelo banco (Open Finance) */
  balance_cents: number;
  current_balance_cents: number;
  is_active: boolean;
  fromBank: boolean;
  institution: string | null;
  created_at: string;
  // Só cartão de crédito
  credit_limit_cents: number | null;
  closing_day: number | null;
  due_day: number | null;
}

export interface AccountInput {
  name: string;
  type: AccountType;
  balance_cents: number;
  is_active: boolean;
  credit_limit_cents?: number | null;
  closing_day?: number | null;
  due_day?: number | null;
}

// RF-04, RF-05: contas com saldo atual calculado no banco (view account_balances)
export async function listAccounts(): Promise<Account[]> {
  const [accounts, balances] = await Promise.all([
    supabase
      .from('accounts')
      .select('id, name, type, balance_cents, is_active, connection_id, created_at, credit_limit_cents, closing_day, due_day, connection:bank_connections(institution_name)')
      .order('name'),
    supabase.from('account_balances').select('account_id, current_balance_cents'),
  ]);
  if (accounts.error) throw accounts.error;
  if (balances.error) throw balances.error;

  const byId = new Map(balances.data.map((b) => [b.account_id, b.current_balance_cents ?? 0]));
  return accounts.data.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    balance_cents: a.balance_cents,
    current_balance_cents: byId.get(a.id) ?? a.balance_cents,
    is_active: a.is_active,
    fromBank: a.connection_id !== null,
    institution: a.connection?.institution_name ?? null,
    created_at: a.created_at,
    credit_limit_cents: a.credit_limit_cents,
    closing_day: a.closing_day,
    due_day: a.due_day,
  }));
}

export async function createAccount(input: AccountInput) {
  const { error } = await supabase.from('accounts').insert(input);
  if (error) throw error;
}

export async function updateAccount(id: string, input: Partial<AccountInput>) {
  const { error } = await supabase.from('accounts').update(input).eq('id', id);
  if (error) throw error;
}

export async function deleteAccount(id: string) {
  const { error } = await supabase.from('accounts').delete().eq('id', id);
  if (error) throw error;
}
