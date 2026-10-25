import { useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { MonthSwitcher } from '@/components/ui/MonthSwitcher';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import type { Account } from '@/features/accounts/api';
import { AccountLogo } from '@/features/accounts/components/AccountLogo';
import { useAccounts } from '@/features/accounts/hooks/useAccounts';
import { formatDayHeader, formatDayMonth, monthRange, startOfMonth } from '@/lib/dates';
import { formatCents } from '@/lib/money';
import { balanceEffect, sumEffectsAfter, type TransactionRow } from '../api';
import { useTransactions } from '../hooks/useTransactions';

// RF-31: histórico de movimentações de todas as contas, com filtro por conta e,
// para uma conta escolhida, o saldo depois de cada lançamento.
export function HistoryPage() {
  const [params, setParams] = useSearchParams();
  const accountId = params.get('conta') ?? '';
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const { start, end } = monthRange(month);

  const { data: accounts } = useAccounts();
  const byId = new Map((accounts ?? []).map((a) => [a.id, a]));
  const selected = accountId ? byId.get(accountId) : undefined;
  // A conta escolhida vem primeiro, para aparecer sem precisar rolar
  const chips = (accounts ?? [])
    .filter((a) => a.is_active || a.id === accountId)
    .sort((a, b) => Number(b.id === accountId) - Number(a.id === accountId));

  const query = useTransactions({ start, end, accountId: accountId || undefined });
  const rows = query.data?.pages.flat() ?? [];

  // Saldo no fim do mês mostrado = saldo atual − o que mexeu na conta depois dele
  const showBalance = !!selected && selected.type !== 'credit_card';
  const after = useQuery({
    queryKey: ['transactions', 'effects-after', accountId, end],
    queryFn: () => sumEffectsAfter(accountId, end),
    enabled: showBalance,
  });
  const balances = new Map<string, number>();
  if (selected && showBalance && after.data !== undefined) {
    let running = selected.current_balance_cents - after.data;
    for (const row of rows) {
      balances.set(row.id, running);
      running -= balanceEffect(row, accountId);
    }
  }

  const inflow = rows.reduce((s, r) => s + Math.max(effectFor(r, accountId), 0), 0);
  const outflow = rows.reduce((s, r) => s + Math.max(-effectFor(r, accountId), 0), 0);

  function choose(id: string) {
    setParams(id ? { conta: id } : {}, { replace: true });
  }

  return (
    <>
      <PageHeader title="Histórico" backTo="/contas" />

      <div className="-mx-5 overflow-x-auto px-5 lg:mx-0 lg:px-0" role="group" aria-label="Filtrar por conta">
        <div className="flex w-max gap-2">
          <Chip active={!accountId} onClick={() => choose('')}>
            Todas as contas
          </Chip>
          {chips.map((a) => (
            <Chip key={a.id} active={a.id === accountId} onClick={() => choose(a.id)}>
              <AccountLogo account={a} size={22} />
              {a.name}
            </Chip>
          ))}
        </div>
      </div>

      <MonthSwitcher month={month} onChange={setMonth} />

      {rows.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3">
            <p className="text-sm text-muted">{accountId ? 'Entrou' : 'Entradas'}</p>
            <p className="font-display font-semibold text-income">{formatCents(inflow)}</p>
          </Card>
          <Card className="p-3">
            <p className="text-sm text-muted">{accountId ? 'Saiu' : 'Saídas'}</p>
            <p className="font-display font-semibold text-expense">{formatCents(outflow)}</p>
          </Card>
        </div>
      )}
      {!accountId && rows.length > 0 && (
        <p className="-mt-2 text-sm text-muted">Com “Todas as contas”, transferências entre contas próprias aparecem neutras.</p>
      )}

      {query.isPending && <LoadingState />}
      {query.error && <ErrorState error={query.error} />}
      {after.error && <ErrorState error={after.error} />}
      {query.isSuccess && rows.length === 0 && <EmptyState>Nenhuma movimentação neste mês{selected ? ` em ${selected.name}` : ''}.</EmptyState>}

      {groupByDay(rows).map(([day, items]) => (
        <section key={day} className="flex flex-col gap-2">
          <h2 className="text-sm font-bold text-muted">{formatDayHeader(day)}</h2>
          <Card className="divide-y divide-line">
            {items.map((t) => (
              <HistoryRow key={t.id} t={t} accountId={accountId} byId={byId} balance={balances.get(t.id)} />
            ))}
          </Card>
        </section>
      ))}

      {query.hasNextPage && (
        <Button variant="secondary" disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
          {query.isFetchingNextPage ? 'Carregando…' : 'Carregar mais'}
        </Button>
      )}
    </>
  );
}

/** Efeito no filtro atual: numa conta, o efeito nela; em "todas", transferências são neutras. */
function effectFor(t: TransactionRow, accountId: string): number {
  if (accountId) return balanceEffect(t, accountId);
  if (t.type === 'transfer') return 0;
  return t.type === 'income' ? t.amount_cents : -t.amount_cents;
}

function HistoryRow({ t, accountId, byId, balance }: { t: TransactionRow; accountId: string; byId: Map<string, Account>; balance?: number }) {
  const effect = effectFor(t, accountId);
  // Na transferência, mostra a conta "do outro lado" quando há uma conta escolhida
  const logoAccount = byId.get(accountId && t.type === 'transfer' && t.account_id === accountId ? (t.transfer_account_id ?? t.account_id) : t.account_id);
  const label = t.nature === 'yield' ? 'Rendimento' : t.nature === 'adjustment' ? 'Ajuste de saldo' : t.category?.name;
  const where =
    t.type === 'transfer'
      ? `${t.account?.name ?? '?'} → ${t.transfer_account?.name ?? '?'}`
      : [label, accountId ? null : t.account?.name].filter(Boolean).join(' · ');

  return (
    <Link to={`/transacoes/${t.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-ground">
      {logoAccount ? <AccountLogo account={logoAccount} size={36} /> : <span className="size-9 shrink-0 rounded-xl bg-ground" aria-hidden="true" />}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{t.description}</p>
        <p className="truncate text-sm text-muted">
          {formatDayMonth(t.occurred_on)} · {where}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className={`font-display font-semibold ${effect > 0 ? 'text-income' : effect < 0 ? 'text-expense' : 'text-muted'}`}>
          {effect > 0 ? '+ ' : effect < 0 ? '− ' : ''}
          {formatCents(effect === 0 ? t.amount_cents : Math.abs(effect))}
        </p>
        {balance !== undefined && <p className="text-xs text-muted">saldo {formatCents(balance)}</p>}
      </div>
    </Link>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold ${
        active ? 'bg-ink text-ground' : 'border border-line-strong bg-surface text-ink'
      }`}
    >
      {children}
    </button>
  );
}

function groupByDay(rows: TransactionRow[]): [string, TransactionRow[]][] {
  const groups = new Map<string, TransactionRow[]>();
  for (const row of rows) {
    const list = groups.get(row.occurred_on) ?? [];
    list.push(row);
    groups.set(row.occurred_on, list);
  }
  return [...groups.entries()];
}
