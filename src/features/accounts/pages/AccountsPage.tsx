import { useState } from 'react';
import { Link } from 'react-router';
import { buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useBillOccurrences } from '@/features/bills/hooks/useBills';
import { isConfiguredCard } from '@/features/cards/hooks/useCards';
import { describeCycle } from '@/features/cards/invoices';
import { startOfMonth } from '@/lib/dates';
import { formatCents } from '@/lib/money';
import { accountTypeLabels, type Account } from '../api';
import { useAccounts } from '../hooks/useAccounts';

// RF-04 a RF-10: saldo consolidado, contas manuais e do banco
export function AccountsPage() {
  const { session, signOut } = useAuth();
  const { data: accounts, isPending, error } = useAccounts();
  const [month] = useState(() => startOfMonth(new Date()));
  const occurrences = useBillOccurrences(month);
  // Quanto ainda vai entrar em cada conta neste mês (recebimentos previstos)
  const incoming = new Map<string, number>();
  for (const o of occurrences.data ?? []) {
    if (o.bill.kind !== 'income' || o.status === 'paid' || !o.bill.account_id) continue;
    incoming.set(o.bill.account_id, (incoming.get(o.bill.account_id) ?? 0) + o.bill.amount_cents);
  }

  const active = accounts?.filter((a) => a.is_active) ?? [];
  const inactive = accounts?.filter((a) => !a.is_active) ?? [];
  const total = active.reduce((sum, a) => sum + a.current_balance_cents, 0);

  return (
    <>
      <PageHeader
        title="Contas"
        action={
          <Link to="/contas/nova" className={buttonClasses('primary', 'h-11 px-4 text-sm')}>
            Nova conta
          </Link>
        }
      />

      <div className="rounded-2xl bg-brand p-5 text-white">
        <p className="text-sm font-semibold opacity-90">Saldo consolidado</p>
        <p className="font-display text-3xl font-semibold">{accounts ? formatCents(total) : '—'}</p>
        <p className="mt-1 text-sm opacity-90">Soma das contas ativas, com cartões descontando a fatura.</p>
      </div>

      {isPending && <LoadingState />}
      {error && <ErrorState error={error} />}
      {accounts?.length === 0 && (
        <EmptyState>
          Nenhuma conta ainda. Cadastre sua conta corrente, cartão ou carteira para começar a lançar transações.
        </EmptyState>
      )}

      {active.length > 0 && <AccountList accounts={active} incoming={incoming} />}
      {inactive.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold text-muted">Desativadas</h2>
          <AccountList accounts={inactive} incoming={incoming} />
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-muted">Mais</h2>
        <Card className="divide-y divide-line">
          <MenuLink to="/categorias" label="Categorias" hint="Organize receitas e despesas" />
          <MenuLink to="/conectar-banco" label="Conectar banco" hint="Open Finance — importação automática" />
          <MenuLink to="/alterar-senha" label="Alterar senha" hint={session?.user.email ?? ''} />
        </Card>
        <button type="button" onClick={signOut} className="h-11 self-start rounded-xl px-1 text-sm font-semibold text-muted underline">
          Sair
        </button>
      </section>
    </>
  );
}

function AccountList({ accounts, incoming }: { accounts: Account[]; incoming: Map<string, number> }) {
  return (
    <Card className="divide-y divide-line">
      {accounts.map((account) => (
        <Link
          key={account.id}
          to={account.type === 'credit_card' ? `/cartoes/${account.id}` : `/contas/${account.id}`}
          className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 hover:bg-ground"
        >
          <div className="min-w-0">
            <p className="truncate font-semibold">{account.name}</p>
            <p className="text-sm text-muted">
              {accountTypeLabels[account.type]}
              {account.fromBank && ` · ${account.institution ?? 'Banco'}`}
              {account.type === 'credit_card' && (isConfiguredCard(account) ? ` · ${cycleLabel(account)}` : ' · configurar fatura')}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className={`font-display font-semibold ${account.current_balance_cents < 0 ? 'text-expense' : ''}`}>
              {formatCents(account.current_balance_cents)}
            </p>
            {incoming.has(account.id) && <p className="text-sm text-income">+ {formatCents(incoming.get(account.id)!)} a receber</p>}
          </div>
        </Link>
      ))}
    </Card>
  );
}

function MenuLink({ to, label, hint }: { to: string; label: string; hint: string }) {
  return (
    <Link to={to} className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 hover:bg-ground">
      <div className="min-w-0">
        <p className="font-semibold">{label}</p>
        <p className="truncate text-sm text-muted">{hint}</p>
      </div>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-muted" aria-hidden="true">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </Link>
  );
}

/** "fecha no último dia, vence 7 dias depois" */
function cycleLabel(card: Account & { closing_day: number }) {
  const { closing, due } = describeCycle(card);
  return `${closing.toLowerCase()}, ${due.toLowerCase()}`;
}
