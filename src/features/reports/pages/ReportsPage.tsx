import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { MonthSwitcher } from '@/components/ui/MonthSwitcher';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import type { Account } from '@/features/accounts/api';
import { useAccounts } from '@/features/accounts/hooks/useAccounts';
import { useBillOccurrences } from '@/features/bills/hooks/useBills';
import type { BillOccurrence } from '@/features/bills/schedule';
import { useCards } from '@/features/cards/hooks/useCards';
import type { Invoice } from '@/features/cards/invoices';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { addMonths, formatMonthYear, monthRange, startOfMonth, toISODate, today } from '@/lib/dates';
import { formatCents, formatSignedCents } from '@/lib/money';
import { exportTransactionsCsv, totalsByCategory, totalsByMonth, type Movement } from '../api';
import { findIssues } from '../checks';
import { CategoryBreakdown } from '../components/CategoryBreakdown';
import { IncomeExpenseChart } from '../components/IncomeExpenseChart';
import { MonthPlanCard } from '../components/MonthPlanCard';
import { ReportChecks } from '../components/ReportChecks';
import { useMovements } from '../hooks/useMovements';
import { buildPlan, type PlanMode } from '../planning';

const HISTORY_MONTHS = 12;
const AHEAD_MONTHS = 3;

// Planejamento do mês (entradas, saídas e diferença), RF-23 (por categoria), RF-24 (receitas x despesas),
// RF-26 (exportar); período padrão = mês civil (RN-08)
export function ReportsPage() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const accounts = useAccounts();
  // 12 meses para trás (gráfico) e 3 para frente (planejamento dos próximos meses)
  const movements = useMovements(month, HISTORY_MONTHS, AHEAD_MONTHS);
  const bills = useBillOccurrences(addMonths(month, AHEAD_MONTHS), AHEAD_MONTHS);
  const cards = useCards();

  const error = accounts.error ?? movements.error ?? bills.error ?? cards.error;

  return (
    <>
      <PageHeader title="Relatórios" action={<ExportButton month={month} />} />
      <MonthSwitcher month={month} onChange={setMonth} />

      {error ? (
        <ErrorState error={error} />
      ) : accounts.data && movements.data && bills.data && cards.data ? (
        <ReportsBody
          month={month}
          onMonthChange={setMonth}
          accounts={accounts.data}
          movements={movements.data}
          occurrences={bills.data}
          invoices={cards.data.flatMap((c) => c.invoices ?? [])}
        />
      ) : (
        <LoadingState />
      )}

      <p className="text-sm text-muted">Transferências entre suas contas e pagamentos de fatura não entram como receita nem despesa.</p>
    </>
  );
}

function ReportsBody({
  month,
  onMonthChange,
  accounts,
  movements,
  occurrences,
  invoices,
}: {
  month: Date;
  onMonthChange: (month: Date) => void;
  accounts: Account[];
  movements: Movement[];
  occurrences: BillOccurrence[];
  invoices: Invoice[];
}) {
  const [mode, setMode] = useState<PlanMode>('cash');
  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const [chartMonths, setChartMonths] = useState<'6' | '12'>('6');
  const { data: categories } = useCategories();

  const cardIds = new Set(accounts.filter((a) => a.type === 'credit_card').map((a) => a.id));
  const todayIso = today();
  const planFor = (m: Date) => buildPlan({ mode, month: m, movements, cardIds, occurrences, invoices, todayIso });

  const plan = planFor(month);
  const ahead = Array.from({ length: AHEAD_MONTHS }, (_, i) => addMonths(month, i + 1)).map((m) => ({ month: m, plan: planFor(m) }));
  const history = totalsByMonth(movements, month, Number(chartMonths), cardIds);
  const byCategory = categories ? totalsByCategory(movements, categories, month, kind, cardIds) : null;
  const issues = findIssues(movements, month, cardIds);

  return (
    <>
      <Card className="flex flex-col gap-4 p-5">
        <h2 className="font-display font-semibold">Planejamento de {formatMonthYear(month).toLowerCase()}</h2>
        <SegmentedControl
          label="Como contar o cartão"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'cash', label: 'Caixa (fatura)' },
            { value: 'consumption', label: 'Data da compra' },
          ]}
        />
        <MonthPlanCard plan={plan} mode={mode} />
      </Card>

      <Card className="flex flex-col gap-2 p-5">
        <h2 className="font-display font-semibold">Próximos meses</h2>
        <p className="text-sm text-muted">Com o que já está lançado ou previsto até agora: parcelas, contas fixas, recebimentos e faturas.</p>
        <table className="w-full text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="py-1 font-semibold">Mês</th>
              <th className="py-1 text-right font-semibold">Entra</th>
              <th className="py-1 text-right font-semibold">Sai</th>
              <th className="py-1 text-right font-semibold">Diferença</th>
            </tr>
          </thead>
          <tbody>
            {ahead.map(({ month: m, plan: p }) => {
              const diff = p.totalIncome - p.totalExpense;
              return (
                <tr key={m.getTime()} className="border-t border-line">
                  <td className="py-1">
                    <button type="button" className="min-h-11 text-left font-semibold text-brand underline" onClick={() => onMonthChange(m)}>
                      {formatMonthYear(m)}
                    </button>
                  </td>
                  <td className="py-1 text-right">{formatCents(p.totalIncome)}</td>
                  <td className="py-1 text-right">{formatCents(p.totalExpense)}</td>
                  <td className={`py-1 text-right font-semibold ${diff >= 0 ? 'text-income' : 'text-expense'}`}>
                    {formatSignedCents(diff, diff >= 0 ? 'income' : 'expense')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <ReportChecks issues={issues} accounts={accounts} month={month} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="flex min-w-0 flex-col gap-4 p-5">
          <h2 className="font-display font-semibold">Por categoria</h2>
          <SegmentedControl
            label="Tipo"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'expense', label: 'Despesas' },
              { value: 'income', label: 'Receitas' },
            ]}
          />
          {byCategory && byCategory.totals.length > 0 ? (
            <>
              <CategoryBreakdown totals={byCategory.totals} />
              {byCategory.refunds > 0 && (
                <p className="text-sm text-muted">Estornos e créditos no cartão sem categoria: − {formatCents(byCategory.refunds)}, já descontados do total.</p>
              )}
            </>
          ) : (
            <EmptyState>Nenhuma {kind === 'expense' ? 'despesa' : 'receita'} neste mês.</EmptyState>
          )}
          <p className="text-sm text-muted">Pela data da compra.</p>
        </Card>

        <Card className="flex min-w-0 flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display font-semibold">Receitas x despesas</h2>
            <SegmentedControl
              label="Período do gráfico"
              value={chartMonths}
              onChange={setChartMonths}
              options={[
                { value: '6', label: '6 meses' },
                { value: '12', label: '12 meses' },
              ]}
            />
          </div>
          {history.some((m) => m.income || m.expense) ? (
            <IncomeExpenseChart data={history} />
          ) : (
            <EmptyState>Sem receitas ou despesas no período.</EmptyState>
          )}
          <p className="text-sm text-muted">Pela data da compra, terminando no mês escolhido no topo.</p>
        </Card>
      </div>
    </>
  );
}

function ExportButton({ month }: { month: Date }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleExport() {
    setBusy(true);
    setFailed(false);
    try {
      const { start, end } = monthRange(month);
      const blob = await exportTransactionsCsv(start, end);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `transacoes-${toISODate(month).slice(0, 7)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="secondary" className="h-11 px-4 text-sm" disabled={busy} onClick={handleExport}>
      {failed ? 'Erro — tentar de novo' : busy ? 'Gerando…' : 'Exportar CSV'}
    </Button>
  );
}
