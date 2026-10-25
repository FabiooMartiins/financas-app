import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { totalBalance as sumTotalBalance } from '@/features/accounts/api';
import { useAccounts } from '@/features/accounts/hooks/useAccounts';
import { BillOccurrenceItem } from '@/features/bills/components/BillOccurrenceItem';
import { useBillOccurrences } from '@/features/bills/hooks/useBills';
import { InvoiceSummaryItem } from '@/features/cards/components/InvoiceParts';
import { useCards } from '@/features/cards/hooks/useCards';
import { useInvestments } from '@/features/investments/hooks/useInvestments';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import { useProfile } from '@/features/profile/hooks/useProfile';
import { totalsByMonth } from '@/features/reports/api';
import { useMovements } from '@/features/reports/hooks/useMovements';
import { listTransactions } from '@/features/transactions/api';
import { TransactionItem } from '@/features/transactions/components/TransactionItem';
import { daysBetween, formatDayMonth, formatMonthYear, monthRange, startOfMonth, today } from '@/lib/dates';
import { formatCents } from '@/lib/money';

// RF-22: saldo total (RN-07), investimentos e cartões, receitas/despesas do mês,
// próximos vencimentos (RF-19, RF-20), últimas transações
export function DashboardPage() {
  const [month] = useState(() => startOfMonth(new Date()));
  const accounts = useAccounts();
  const movements = useMovements(month, 1);
  // 2 meses para trás: conta não paga continua aparecendo como vencida (RN-04)
  const bills = useBillOccurrences(month, 2);
  const cards = useCards();
  const investments = useInvestments();
  const { data: profile } = useProfile();
  const recent = useQuery({
    queryKey: ['transactions', 'recent'],
    queryFn: () => listTransactions({ start: '2000-01-01', end: today() }),
    select: (rows) => rows.slice(0, 6),
  });

  // RN-07: só contas bancárias e carteira; cartões e investimentos aparecem à parte
  const totalBalance = accounts.data ? sumTotalBalance(accounts.data) : undefined;
  const investedTotal = investments.data?.reduce((s, i) => s + i.account.current_balance_cents, 0);
  const investedMonthYield = investments.data?.reduce((s, i) => s + i.monthYieldCents, 0) ?? 0;
  const cardInvoices = cards.data?.flatMap((c) => c.invoices ?? []) ?? [];
  // Faturas a pagar (fechadas/vencidas) + o que já está na fatura aberta
  const cardsOwed = cardInvoices
    .filter((i) => i.status === 'closed' || i.status === 'overdue' || i.status === 'open')
    .reduce((s, i) => s + (i.status === 'open' ? Math.max(i.total - i.paid, 0) : i.remaining), 0);
  const nextCardDue = cardInvoices
    .filter((i) => i.remaining > 0 && i.status !== 'future')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  const greetingName = profile?.nickname || profile?.full_name?.split(' ')[0];
  const totals = movements.data ? totalsByMonth(movements.data, month, 1)[0] : undefined;

  const notDone = bills.data?.filter((o) => o.status !== 'paid' && (o.status === 'overdue' || o.month.getTime() === month.getTime())) ?? [];
  const pending = notDone.filter((o) => o.bill.kind === 'expense');
  // Recebimentos previstos (atrasados ou deste mês)
  const receivables = notDone.filter((o) => o.bill.kind === 'income');
  const receivableTotal = receivables.reduce((sum, o) => sum + o.bill.amount_cents, 0);
  const todayIso = today();
  const monthEnd = monthRange(month).end;
  // Faturas: fechadas/vencidas com saldo, ou que vencem até o fim do mês (RN-02)
  const pendingInvoices =
    cards.data
      ?.flatMap((c) => c.invoices ?? [])
      .filter((i) => i.remaining > 0 && (i.status === 'closed' || i.status === 'overdue' || i.dueDate <= monthEnd)) ?? [];

  // RF-20: lembretes de contas e faturas
  const overdueNames = [
    ...pending.filter((o) => o.status === 'overdue').map((o) => o.bill.name),
    ...pendingInvoices.filter((i) => i.status === 'overdue').map((i) => `Fatura ${i.cardName}`),
  ];
  const dueSoonNames = [
    ...pending.filter((o) => o.status === 'due-soon').map((o) => `${o.bill.name} (${formatDayMonth(o.dueDate)})`),
    ...pendingInvoices
      .filter((i) => i.status === 'closed' && daysBetween(todayIso, i.dueDate) <= 5)
      .map((i) => `Fatura ${i.cardName} (${formatDayMonth(i.dueDate)})`),
  ];

  const upcoming = [
    ...pending.map((o) => ({ due: o.dueDate, key: `b-${o.bill.id}-${o.dueDate}`, node: <BillOccurrenceItem occurrence={o} showMonth /> })),
    ...pendingInvoices.map((i) => ({ due: i.dueDate, key: `f-${i.cardId}-${i.key}`, node: <InvoiceSummaryItem invoice={i} /> })),
  ]
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 6);
  const isNewUser = accounts.data?.length === 0;

  return (
    <>
      <div className="flex items-center gap-3">
        <Link to="/perfil" aria-label="Abrir meu perfil" className="rounded-full">
          <ProfileAvatar size={48} />
        </Link>
        <div className="min-w-0">
          <p className="text-sm text-muted">{formatMonthYear(month)}</p>
          <h1 className="truncate font-display text-2xl font-semibold">{greetingName ? `Olá, ${greetingName}!` : 'Olá!'}</h1>
        </div>
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
      {(overdueNames.length > 0 || dueSoonNames.length > 0) && (
        <Link
          to="/vencimentos"
          role="alert"
          className={`flex flex-col gap-1 rounded-2xl p-4 text-sm font-semibold ${
            overdueNames.length > 0 ? 'bg-expense-soft text-expense' : 'bg-warn-soft text-warn'
          }`}
        >
          {overdueNames.length > 0 && <span>Vencido sem pagamento: {overdueNames.join(', ')}.</span>}
          {dueSoonNames.length > 0 && <span>Vencendo em breve: {dueSoonNames.join(', ')}.</span>}
        </Link>
      )}

      {/* Celular: empilhado. PC: saldo à esquerda, receitas/despesas à direita. */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Link to="/contas" className="rounded-2xl bg-brand p-5 text-on-brand lg:col-span-1">
          <p className="text-sm font-semibold">Saldo total em contas</p>
          <p className="font-display text-3xl font-semibold">{totalBalance !== undefined ? formatCents(totalBalance) : '—'}</p>
          <p className="mt-1 text-sm">Sem cartão nem investimentos</p>
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

      {/* RF-27, RF-28: cartões e investimentos separados do saldo */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/investimentos" className="flex flex-col gap-1 rounded-2xl border border-line bg-surface p-4 hover:bg-ground">
          <span className="text-sm text-muted">Investimentos</span>
          <span className="font-display text-lg font-semibold">{investedTotal !== undefined ? formatCents(investedTotal) : '—'}</span>
          {investedMonthYield !== 0 && (
            <span className={`text-sm font-bold ${investedMonthYield > 0 ? 'text-income' : 'text-expense'}`}>
              {investedMonthYield > 0 ? '+' : '−'} {formatCents(Math.abs(investedMonthYield))} este mês
            </span>
          )}
        </Link>
        <Link to="/cartoes" className="flex flex-col gap-1 rounded-2xl border border-line bg-surface p-4 hover:bg-ground">
          <span className="text-sm text-muted">Cartões</span>
          <span className={`font-display text-lg font-semibold ${cardsOwed > 0 ? 'text-expense' : ''}`}>{cards.data ? formatCents(cardsOwed) : '—'}</span>
          <span className="text-sm text-muted">{nextCardDue ? `${nextCardDue.cardName} · vence ${formatDayMonth(nextCardDue.dueDate)}` : 'em faturas'}</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold">Próximos vencimentos</h2>
            <Link to="/vencimentos" className="flex min-h-11 items-center text-sm font-semibold text-brand">
              Ver todos
            </Link>
          </div>
          {bills.isPending && <LoadingState />}
          {bills.error && <ErrorState error={bills.error} />}
          {bills.data && cards.data && upcoming.length === 0 && <EmptyState>Nenhuma conta pendente neste mês.</EmptyState>}
          {upcoming.length > 0 && (
            <Card className="divide-y divide-line">
              {upcoming.map((item) => (
                <div key={item.key}>{item.node}</div>
              ))}
            </Card>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold">
              A receber{receivables.length > 0 && <span className="font-normal text-income"> · {formatCents(receivableTotal)}</span>}
            </h2>
            <Link to="/vencimentos?aba=receber" className="flex min-h-11 items-center text-sm font-semibold text-brand">
              Ver todos
            </Link>
          </div>
          {bills.data && receivables.length === 0 && (
            <EmptyState>
              Nenhum recebimento previsto neste mês.{' '}
              <Link to="/vencimentos/nova?tipo=receber" className="font-semibold text-brand underline">
                Cadastrar recebimento
              </Link>
            </EmptyState>
          )}
          {receivables.length > 0 && (
            <Card className="divide-y divide-line">
              {receivables.slice(0, 4).map((o) => (
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
