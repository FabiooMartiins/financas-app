import { useState } from 'react';
import { Link } from 'react-router';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { accountTypeLabels } from '@/features/accounts/api';
import { AccountLogo } from '@/features/accounts/components/AccountLogo';
import { AdjustBalanceForm } from '@/features/accounts/components/AdjustBalanceForm';
import { formatMonthYear } from '@/lib/dates';
import { formatCents } from '@/lib/money';
import { useInvestments } from '../hooks/useInvestments';
import { formatRate, type InvestmentSummary } from '../returns';
import { SectionTabs } from '@/components/layout/SectionTabs';

// RF-28, RF-29: poupança e caixinhas separadas, com valor aplicado, lucro e rendimento (RN-09)
export function InvestmentsPage() {
  const { data, isPending, error } = useInvestments();
  const month = formatMonthYear(new Date()).toLowerCase();

  const total = data?.reduce((s, i) => s + i.account.current_balance_cents, 0) ?? 0;
  const profit = data?.reduce((s, i) => s + i.profitCents, 0) ?? 0;
  const monthYield = data?.reduce((s, i) => s + i.monthYieldCents, 0) ?? 0;

  return (
    <>
      <PageHeader
        title="Investimentos"
        action={
          <Link to="/contas/nova?tipo=investment" className={buttonClasses('primary', 'h-11 shrink-0 px-4 text-sm whitespace-nowrap')}>
            Nova caixinha
          </Link>
        }
      />
      <SectionTabs section="dinheiro" />

      {data && data.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl bg-hero p-5 text-on-hero">
          <div>
            <p className="text-sm font-semibold opacity-80">Total investido</p>
            <p className="font-display text-3xl font-semibold">{formatCents(total)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-sm opacity-80">Lucro total</p>
              <p className="font-display text-lg font-semibold">{signed(profit)}</p>
            </div>
            <div>
              <p className="text-sm opacity-80">Rendeu em {month.split(' ')[0]}</p>
              <p className="font-display text-lg font-semibold">{signed(monthYield)}</p>
            </div>
          </div>
          <p className="text-sm opacity-80">Fica fora do saldo total em contas.</p>
        </div>
      )}

      {isPending && <LoadingState />}
      {error && <ErrorState error={error} />}
      {data?.length === 0 && (
        <EmptyState>
          Nenhuma poupança ou caixinha cadastrada. Cadastre com o valor guardado hoje para acompanhar quanto está rendendo.{' '}
          <Link to="/contas/nova?tipo=investment" className="font-semibold text-brand underline">
            Cadastrar caixinha
          </Link>
        </EmptyState>
      )}

      {data?.map((summary) => (
        <InvestmentCard key={summary.account.id} summary={summary} />
      ))}

      {data && data.length > 0 && (
        <p className="text-sm text-muted">
          Lucro = saldo atual − (o que você guardou − o que resgatou). Para registrar o rendimento, toque em “Atualizar saldo” e informe o saldo
          que aparece no app do banco: a diferença entra como rendimento e não conta como receita nos relatórios.
        </p>
      )}
    </>
  );
}

function InvestmentCard({ summary }: { summary: InvestmentSummary }) {
  const { account } = summary;
  const [updating, setUpdating] = useState(false);

  return (
    <Card className="flex flex-col gap-4 p-4">
      <Link to={`/contas/${account.id}`} className="-m-1 flex items-center gap-3 rounded-xl p-1 hover:bg-ground">
        <AccountLogo account={account} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display font-semibold">{account.name}</p>
          <p className="truncate text-sm text-muted">{account.yield_note ? `Rende ${account.yield_note}` : accountTypeLabels[account.type]}</p>
        </div>
        <p className="shrink-0 font-display font-semibold">{formatCents(account.current_balance_cents)}</p>
      </Link>

      <dl className="grid grid-cols-3 gap-2 border-t border-line pt-3">
        <div>
          <dt className="text-xs text-muted">Aplicado</dt>
          <dd className="text-sm font-bold">{formatCents(summary.investedCents)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Lucro</dt>
          <dd className={`text-sm font-bold ${summary.profitCents < 0 ? 'text-expense' : 'text-income'}`}>{signed(summary.profitCents)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Rentabilidade</dt>
          <dd className={`text-sm font-bold ${(summary.profitRate ?? 0) < 0 ? 'text-expense' : 'text-income'}`}>
            {summary.profitRate !== null ? formatRate(summary.profitRate) : '—'}
          </dd>
        </div>
      </dl>
      <p className="flex justify-between rounded-xl bg-ground px-3 py-2 text-sm">
        <span className="text-muted">Rendeu este mês</span>
        <strong className={summary.monthYieldCents < 0 ? 'text-expense' : 'text-income'}>{signed(summary.monthYieldCents)}</strong>
      </p>

      {updating ? (
        <div className="flex flex-col gap-3 rounded-xl border border-line p-3">
          <AdjustBalanceForm account={account} />
          <Button variant="ghost" className="h-11 text-sm" onClick={() => setUpdating(false)}>
            Fechar
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <Button variant="secondary" className="h-11 px-2 text-sm" onClick={() => setUpdating(true)} disabled={account.fromBank}>
            Atualizar saldo
          </Button>
          <Link to={`/transacoes/nova?tipo=transfer&destino=${account.id}`} className={buttonClasses('secondary', 'h-11 px-2 text-sm')}>
            Guardar
          </Link>
          <Link to={`/transacoes/nova?tipo=transfer&origem=${account.id}`} className={buttonClasses('secondary', 'h-11 px-2 text-sm')}>
            Resgatar
          </Link>
        </div>
      )}
    </Card>
  );
}

function signed(cents: number): string {
  return `${cents >= 0 ? '+' : '−'} ${formatCents(Math.abs(cents))}`;
}
