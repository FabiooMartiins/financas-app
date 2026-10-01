import { Link } from 'react-router';
import { buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { formatCents } from '@/lib/money';
import { accountTypeLabels, type Account } from '../api';
import { useAccounts } from '../hooks/useAccounts';

// RF-04 a RF-10: saldo consolidado, contas manuais e do banco
export function AccountsPage() {
  const { session, signOut } = useAuth();
  const { data: accounts, isPending, error } = useAccounts();

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

      {active.length > 0 && <AccountList accounts={active} />}
      {inactive.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold text-muted">Desativadas</h2>
          <AccountList accounts={inactive} />
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

function AccountList({ accounts }: { accounts: Account[] }) {
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
              {account.type === 'credit_card' && (account.due_day ? ` · vence dia ${account.due_day}` : ' · configurar fatura')}
            </p>
          </div>
          <p className={`shrink-0 font-display font-semibold ${account.current_balance_cents < 0 ? 'text-expense' : ''}`}>
            {formatCents(account.current_balance_cents)}
          </p>
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
