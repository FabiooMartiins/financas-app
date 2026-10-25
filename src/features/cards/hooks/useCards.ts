import { useQuery } from '@tanstack/react-query';
import { useAccounts } from '@/features/accounts/hooks/useAccounts';
import type { Account } from '@/features/accounts/api';
import { today } from '@/lib/dates';
import { listCardMovements } from '../api';
import { buildInvoices, type CardSettings, type Invoice } from '../invoices';

export interface CardWithInvoices {
  card: Account;
  /** null quando o cartão ainda não tem fechamento/vencimento configurados */
  invoices: Invoice[] | null;
}

export function isConfiguredCard(a: Account): a is Account & { closing_day: number; due_day: number } {
  return a.type === 'credit_card' && a.closing_day !== null && a.due_day !== null;
}

/** Cartões ativos (ou um cartão específico) com as faturas calculadas. */
export function useCards(cardId?: string) {
  const accounts = useAccounts();
  const cards = accounts.data?.filter((a) => a.type === 'credit_card' && (cardId ? a.id === cardId : a.is_active)) ?? [];
  const ids = cards.map((c) => c.id);

  const movements = useQuery({
    queryKey: ['card-movements', ids],
    queryFn: () => listCardMovements(ids),
    enabled: accounts.isSuccess,
  });

  let data: CardWithInvoices[] | undefined;
  if (accounts.data && movements.data) {
    const todayIso = today();
    data = cards.map((card) => ({
      card,
      invoices: isConfiguredCard(card) ? buildInvoices(toSettings(card), movements.data, todayIso) : null,
    }));
  }

  return {
    data,
    isPending: accounts.isPending || (accounts.isSuccess && movements.isPending),
    error: accounts.error ?? movements.error,
  };
}

function toSettings(card: Account & { closing_day: number; due_day: number }): CardSettings {
  return {
    id: card.id,
    name: card.name,
    closing_day: card.closing_day,
    due_day: card.due_day,
    credit_limit_cents: card.credit_limit_cents,
    balance_cents: card.balance_cents,
    created_at: card.created_at,
  };
}
