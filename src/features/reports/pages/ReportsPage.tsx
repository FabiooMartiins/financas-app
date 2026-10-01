import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { MonthSwitcher } from '@/components/ui/MonthSwitcher';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { monthRange, startOfMonth, toISODate } from '@/lib/dates';
import { formatCents, formatSignedCents } from '@/lib/money';
import { exportTransactionsCsv, totalsByCategory, totalsByMonth } from '../api';
import { CategoryBreakdown } from '../components/CategoryBreakdown';
import { IncomeExpenseChart } from '../components/IncomeExpenseChart';
import { useMovements } from '../hooks/useMovements';

const HISTORY_MONTHS = 6;

// RF-23 (por categoria), RF-24 (receitas x despesas, 6 meses), RF-26 (exportar);
// período padrão = mês civil (RN-08)
export function ReportsPage() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const movements = useMovements(month, HISTORY_MONTHS);
  const { data: categories } = useCategories();

  const history = movements.data ? totalsByMonth(movements.data, month, HISTORY_MONTHS) : [];
  const current = history[history.length - 1];
  const byCategory = movements.data && categories ? totalsByCategory(movements.data, categories, month, kind) : [];
  const result = current ? current.income - current.expense : 0;

  return (
    <>
      <PageHeader title="Relatórios" action={<ExportButton month={month} />} />
      <MonthSwitcher month={month} onChange={setMonth} />

      {movements.isPending && <LoadingState />}
      {movements.error && <ErrorState error={movements.error} />}

      {current && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Card className="p-4">
            <p className="text-sm text-muted">Receitas</p>
            <p className="font-display text-lg font-semibold text-income">{formatCents(current.income)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted">Despesas</p>
            <p className="font-display text-lg font-semibold text-expense">{formatCents(current.expense)}</p>
          </Card>
          <Card className="col-span-2 p-4 lg:col-span-1">
            <p className="text-sm text-muted">Resultado do mês</p>
            <p className={`font-display text-lg font-semibold ${result >= 0 ? 'text-income' : 'text-expense'}`}>
              {formatSignedCents(result, result >= 0 ? 'income' : 'expense')}
            </p>
          </Card>
        </div>
      )}

      {movements.data && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card className="flex flex-col gap-4 p-5">
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
            {byCategory.length > 0 ? (
              <CategoryBreakdown totals={byCategory} />
            ) : (
              <EmptyState>Nenhuma {kind === 'expense' ? 'despesa' : 'receita'} neste mês.</EmptyState>
            )}
          </Card>

          <Card className="flex flex-col gap-4 p-5">
            <h2 className="font-display font-semibold">Receitas x despesas — últimos {HISTORY_MONTHS} meses</h2>
            {history.some((m) => m.income || m.expense) ? (
              <IncomeExpenseChart data={history} />
            ) : (
              <EmptyState>Sem receitas ou despesas nos últimos {HISTORY_MONTHS} meses.</EmptyState>
            )}
          </Card>
        </div>
      )}
      <p className="text-sm text-muted">Transferências entre suas contas e pagamentos de fatura não entram nos totais.</p>
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
