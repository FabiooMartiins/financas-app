import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useAccounts } from '@/features/accounts/hooks/useAccounts';
import { BillOccurrenceItem } from '@/features/bills/components/BillOccurrenceItem';
import { useBillOccurrences } from '@/features/bills/hooks/useBills';
import { totalsByMonth } from '@/features/reports/api';
import { useMovements } from '@/features/reports/hooks/useMovements';
import { listTransactions } from '@/features/transactions/api';
import { TransactionItem } from '@/features/transactions/components/TransactionItem';
import { formatDayMonth, formatMonthYear, startOfMonth, today } from '@/lib/dates';
import { formatCents } from '@/lib/money';

// RF-22: saldo total, receitas/despesas do mês, próximos vencimentos (RF-19, RF-20), últimas transações
export function DashboardPage() {
  const [month] = useState(() => startOfMonth(new Date()));
  const accounts = useAccounts();
  const movements = useMovements(month, 1);
  // 2 meses para trás: conta não paga continua aparecendo como vencida (RN-04)
  const bills = useBillOccurrences(month, 2);
  const recent = useQuery({
    queryKey: ['transactions', 'recent'],
    queryFn: () => listTransactions({ start: '2000-01-01', end: today() }),
    select: (rows) => rows.slice(0, 6),
  });

  const totalBalance = accounts.data?.filter((a) => a.is_active).reduce((s, a) => s + a.current_balance_cents, 0);
  const totals = movements.data ? totalsByMonth(movements.data, month, 1)[0] : undefined;

  const pending = bills.data?.filter((o) => o.status !== 'paid' && (o.status === 'overdue' || o.month.getTime() === month.getTime())) ?? [];
  const alerts = pending.filter((o) => o.status === 'overdue' || o.status === 'due-soon');
  const nextBills = pending.slice(0, 5);
  const isNewUser = accounts.data?.length === 0;

  return (
    <>
      <div>
        <p className="text-sm text-muted">{formatMonthYear(month)}</p>
        <h1 className="font-display text-2xl font-semibold">Olá!</h1>
      </div>

      {isNewUser && (
        <Card className="flex flex-col gap-3 p-5">
          <h2 className="font-display font-semibold">Comece por aqui</h2>
          <ol className="list-decimal pl-5 text-sm text-muted">
            <li>Cadastre suas contas (corrente, cartão, carteira) com o saldo de hoje.</li>
            <li>Lance as transações do dia a dia.</li>
            <li>Cadastre as contas fixas do mês para acompanhar os vencimentos.</li>
          </ol>
          <Link to="/contas/nova" className={buttonClasses('primary', 'self-start')}>
            Cadastrar primeira conta
          </Link>
        </Card>
      )}

      {/* RF-20: lembrete de vencimento */}
      {alerts.length > 0 && (
        <Link
          to="/vencimentos"
          role="alert"
          className={`flex flex-col gap-1 rounded-2xl p-4 text-sm font-semibold ${
            alerts.some((o) => o.status === 'overdue') ? 'bg-expense-soft text-expense' : 'bg-[#FFF4DC] text-[#8A5A00]'
          }`}
        >
          {alerts.filter((o) => o.status === 'overdue').length > 0 && (
            <span>
              {alerts.filter((o) => o.status === 'overdue').length} conta(s) vencida(s) sem pagamento.
            </span>
          )}
          {alerts.filter((o) => o.status === 'due-soon').length > 0 && (
            <span>
              Vencendo em breve:{' '}
              {alerts
                .filter((o) => o.status === 'due-soon')
                .map((o) => `${o.bill.name} (${formatDayMonth(o.dueDate)})`)
                .join(', ')}
            </span>
          )}
        </Link>
      )}

      {/* Celular: empilhado. PC: saldo à esquerda, receitas/despesas à direita. */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Link to="/contas" className="rounded-2xl bg-brand p-5 text-white lg:col-span-1">
          <p className="text-sm font-semibold opacity-90">Saldo total</p>
          <p className="font-display text-3xl font-semibold">{totalBalance !== undefined ? formatCents(totalBalance) : '—'}</p>
        </Link>
        <div className="grid grid-cols-2 gap-3 lg:col-span-2">
          <Card className="p-4">
            <p className="text-sm text-muted">Receitas do mês</p>
            <p className="font-display text-lg font-semibold text-income">{totals ? formatCents(totals.income) : '—'}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted">Despesas do mês</p>
            <p className="font-display text-lg font-semibold text-expense">{totals ? formatCents(totals.expense) : '—'}</p>
          </Card>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold">Próximos vencimentos</h2>
            <Link to="/vencimentos" className="flex min-h-11 items-center text-sm font-semibold text-brand">
              Ver todos
            </Link>
          </div>
          {bills.isPending && <LoadingState />}
          {bills.error && <ErrorState error={bills.error} />}
          {bills.data && nextBills.length === 0 && <EmptyState>Nenhuma conta pendente neste mês.</EmptyState>}
          {nextBills.length > 0 && (
            <Card className="divide-y divide-line">
              {nextBills.map((o) => (
                <BillOccurrenceItem key={`${o.bill.id}-${o.dueDate}`} occurrence={o} showMonth />
              ))}
            </Card>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold">Últimas transações</h2>
            <Link to="/transacoes" className="flex min-h-11 items-center text-sm font-semibold text-brand">
              Ver todas
            </Link>
          </div>
          {recent.isPending && <LoadingState />}
          {recent.error && <ErrorState error={recent.error} />}
          {recent.data?.length === 0 && <EmptyState>Nenhuma transação ainda.</EmptyState>}
          {recent.data && recent.data.length > 0 && (
            <Card className="divide-y divide-line">
              {recent.data.map((t) => (
                <TransactionItem key={t.id} transaction={t} showDate={formatDayMonth(t.occurred_on)} />
              ))}
            </Card>
          )}
        </section>
      </div>
    </>
  );
}
