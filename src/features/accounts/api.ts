import { supabase } from '@/lib/supabase';
import { toISODate } from '@/lib/dates';
import type { Database } from '@/types/database';

export type AccountType = Database['public']['Enums']['account_type'];

export const accountTypeLabels: Record<AccountType, string> = {
  checking: 'Conta corrente',
  savings: 'Poupança',
  credit_card: 'Cartão de crédito',
  wallet: 'Carteira',
  investment: 'Caixinha / investimento',
};

/**
 * RF-27, RF-28: três grupos separados.
 * bank = conta corrente e carteira (entram no saldo total — RN-07)
 * card = cartão de crédito (controlado por fatura)
 * investment = poupança e caixinhas (rendimento e lucro — RN-09)
 */
export type AccountGroup = 'bank' | 'card' | 'investment';

export function accountGroup(type: AccountType): AccountGroup {
  if (type === 'credit_card') return 'card';
  if (type === 'savings' || type === 'investment') return 'investment';
  return 'bank';
}

/** RN-07: saldo total = contas bancárias e carteira ativas marcadas para somar. */
export function countsInTotal(a: Pick<Account, 'type' | 'is_active' | 'include_in_total'>): boolean {
  return a.is_active && a.include_in_total && accountGroup(a.type) === 'bank';
}

export function totalBalance(accounts: Account[]): number {
  return accounts.filter(countsInTotal).reduce((sum, a) => sum + a.current_balance_cents, 0);
}

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
  logo_path: string | null;
  include_in_total: boolean;
  yield_note: string | null;
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
  include_in_total?: boolean;
  yield_note?: string | null;
  credit_limit_cents?: number | null;
  closing_day?: number | null;
  due_day?: number | null;
}

// RF-04, RF-05: contas com saldo atual calculado no banco (view account_balances)
export async function listAccounts(): Promise<Account[]> {
  const [accounts, balances] = await Promise.all([
    supabase
      .from('accounts')
      .select('id, name, type, balance_cents, is_active, connection_id, created_at, credit_limit_cents, closing_day, due_day, logo_path, include_in_total, yield_note, connection:bank_connections(institution_name)')
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
    logo_path: a.logo_path,
    include_in_total: a.include_in_total,
    yield_note: a.yield_note,
    credit_limit_cents: a.credit_limit_cents,
    closing_day: a.closing_day,
    due_day: a.due_day,
  }));
}

export async function createAccount(input: AccountInput): Promise<string> {
  const { data, error } = await supabase.from('accounts').insert(input).select('id').single();
  if (error) throw error;
  return data.id;
}

/** RF-32: guarda o caminho do logo enviado (ou null para remover). */
export async function setAccountLogo(id: string, logoPath: string | null) {
  const { error } = await supabase.from('accounts').update({ logo_path: logoPath }).eq('id', id);
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

export type AdjustMode = 'transaction' | 'silent';

/**
 * RF-30: deixa o saldo do app igual ao saldo real.
 * - 'transaction': lança a diferença como "Ajuste de saldo" (ou "Rendimento" quando um
 *   investimento subiu), que não conta como receita/despesa (RN-10);
 * - 'silent': só corrige o saldo inicial, sem transação.
 */
export async function adjustBalance(account: Account, realCents: number, mode: AdjustMode) {
  const diff = realCents - account.current_balance_cents;
  if (diff === 0) return;
  if (account.fromBank) throw new Error('O saldo desta conta vem do banco e é atualizado na sincronização.');

  if (mode === 'silent') {
    await updateAccount(account.id, { balance_cents: account.balance_cents + diff });
    return;
  }

  const isYield = accountGroup(account.type) === 'investment' && diff > 0;
  const { error } = await supabase.from('transactions').insert({
    account_id: account.id,
    type: diff > 0 ? 'income' : 'expense',
    nature: isYield ? 'yield' : 'adjustment',
    amount_cents: Math.abs(diff),
    description: isYield ? 'Rendimento' : 'Ajuste de saldo',
    occurred_on: toISODate(new Date()),
  });
  if (error) throw error;
}
