import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useBillOccurrences } from '@/features/bills/hooks/useBills';
import { startOfMonth } from '@/lib/dates';
import { formatCents } from '@/lib/money';
import { accountGroup, accountTypeLabels, totalBalance, type Account, type AccountGroup } from '../api';
import { AccountLogo } from '../components/AccountLogo';
import { useAccounts } from '../hooks/useAccounts';

const groupTitles: Record<AccountGroup, string> = {
  bank: 'Contas bancárias e carteira',
  card: 'Cartões de crédito',
  investment: 'Investimentos',
};

// RF-04 a RF-10, RF-27, RF-28: contas separadas em três grupos; saldo total só das bancárias (RN-07)
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
  const byGroup = (group: AccountGroup) => active.filter((a) => accountGroup(a.type) === group);
  const total = accounts ? totalBalance(accounts) : undefined;
  const invested = byGroup('investment').reduce((sum, a) => sum + a.current_balance_cents, 0);

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

      <div className="rounded-2xl bg-brand p-5 text-on-brand">
        <p className="text-sm font-semibold">Saldo total em contas</p>
        <p className="font-display text-3xl font-semibold">{total !== undefined ? formatCents(total) : '—'}</p>
        <p className="mt-1 text-sm">Contas bancárias e carteira. Cartões e investimentos ficam de fora.</p>
      </div>

      {isPending && <LoadingState />}
      {error && <ErrorState error={error} />}
      {accounts?.length === 0 && (
        <EmptyState>
          Nenhuma conta ainda. Cadastre sua conta corrente, cartão, caixinha ou carteira para começar a lançar transações.
        </EmptyState>
      )}

      {byGroup('bank').length > 0 && (
        <GroupSection title={groupTitles.bank} link={{ to: '/historico', label: 'Ver histórico' }}>
          <AccountList accounts={byGroup('bank')} incoming={incoming} />
        </GroupSection>
      )}

      {byGroup('card').length > 0 && (
        <GroupSection title={groupTitles.card} link={{ to: '/cartoes', label: 'Ver faturas' }}>
          <AccountList accounts={byGroup('card')} incoming={incoming} />
        </GroupSection>
      )}

      {byGroup('investment').length > 0 && (
        <GroupSection title={`${groupTitles.investment} · ${formatCents(invested)}`} link={{ to: '/investimentos', label: 'Ver rendimentos' }}>
          <AccountList accounts={byGroup('investment')} incoming={incoming} />
        </GroupSection>
      )}

      {inactive.length > 0 && (
        <GroupSection title="Desativadas">
          <AccountList accounts={inactive} incoming={incoming} />
        </GroupSection>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-muted">Mais</h2>
        <Card className="divide-y divide-line">
          <MenuLink to="/perfil" label="Meu perfil" hint="Foto, dados pessoais e tema" />
          <MenuLink to="/historico" label="Histórico de movimentações" hint="Todas as contas juntas" />
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

function GroupSection({ title, link, children }: { title: string; link?: { to: string; label: string }; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-muted">{title}</h2>
        {link && (
          <Link to={link.to} className="flex min-h-11 items-center text-sm font-semibold text-brand">
            {link.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function AccountList({ accounts, incoming }: { accounts: Account[]; incoming: Map<string, number> }) {
  return (
    <Card className="divide-y divide-line">
      {accounts.map((account) => {
        const isCard = account.type === 'credit_card';
        return (
          <Link
            key={account.id}
            to={isCard ? `/cartoes/${account.id}` : `/contas/${account.id}`}
            className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-ground"
          >
            <AccountLogo account={account} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{account.name}</p>
              <p className="truncate text-sm text-muted">
                {/* O grupo já diz o tipo; aqui vai o que muda de conta para conta */}
                {isCard
                  ? account.due_day
                    ? `Vence dia ${account.due_day}`
                    : 'Configurar fatura'
                  : account.yield_note
                    ? `Rende ${account.yield_note}`
                    : accountTypeLabels[account.type]}
                {account.fromBank && ` · ${account.institution ?? 'Banco'}`}
                {accountGroup(account.type) === 'bank' && !account.include_in_total && ' · fora do saldo total'}
              </p>
            </div>
            <div className="shrink-0 text-right">
              {/* Cartão: mostra quanto deve (positivo), não saldo negativo */}
              <p className={`font-display font-semibold ${isCard || account.current_balance_cents < 0 ? 'text-expense' : ''}`}>
                {formatCents(isCard ? Math.max(-account.current_balance_cents, 0) : account.current_balance_cents)}
              </p>
              {isCard && <p className="text-sm text-muted">em aberto</p>}
              {incoming.has(account.id) && <p className="text-sm text-income">+ {formatCents(incoming.get(account.id)!)} a receber</p>}
            </div>
          </Link>
        );
      })}
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
