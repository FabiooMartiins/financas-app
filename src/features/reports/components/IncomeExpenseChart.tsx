import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import { formatCents, formatSignedCents } from '@/lib/money';
import { formatMonthYear } from '@/lib/dates';
import type { MonthTotals } from '../api';

// Verde validado para marcas de gráfico (o #0E6B58 da marca fica acinzentado
// demais como preenchimento); despesa usa o mesmo laranja da interface.
const INCOME = 'var(--color-chart-income)';
const EXPENSE = 'var(--color-chart-expense)';

const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

/** RF-24: receitas x despesas por mês (barras agrupadas, um único eixo). */
export function IncomeExpenseChart({ data }: { data: MonthTotals[] }) {
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex gap-4 text-sm text-muted" aria-label="Legenda">
        <li className="flex items-center gap-2">
          <span className="size-3 rounded-sm" style={{ background: INCOME }} aria-hidden="true" />
          Receitas
        </li>
        <li className="flex items-center gap-2">
          <span className="size-3 rounded-sm" style={{ background: EXPENSE }} aria-hidden="true" />
          Despesas
        </li>
      </ul>
      <div className="h-60" role="img" aria-label="Gráfico de receitas e despesas por mês. Os valores estão na tabela abaixo.">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2} barCategoryGap="28%" margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-line)" />
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: 'var(--color-line-strong)' }} tick={{ fill: 'var(--color-muted)', fontSize: 12 }} />
            <YAxis
              width={44}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--color-muted)', fontSize: 12 }}
              tickFormatter={(v: number) => compact.format(v / 100)}
            />
            <Tooltip cursor={{ fill: 'var(--color-ground)' }} content={(props) => <ChartTooltip {...props} />} />
            <Bar dataKey="income" name="Receitas" fill={INCOME} radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="expense" name="Despesas" fill={EXPENSE} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <details className="text-sm">
        <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-muted">Ver tabela</summary>
        <table className="w-full text-left">
          <thead className="text-muted">
            <tr>
              <th className="py-1 font-semibold">Mês</th>
              <th className="py-1 text-right font-semibold">Receitas</th>
              <th className="py-1 text-right font-semibold">Despesas</th>
              <th className="py-1 text-right font-semibold">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {data.map((m) => (
              <tr key={m.label} className="border-t border-line">
                <td className="py-2">{formatMonthYear(m.month)}</td>
                <td className="py-2 text-right">{formatCents(m.income)}</td>
                <td className="py-2 text-right">{formatCents(m.expense)}</td>
                <td className="py-2 text-right font-semibold">{formatCents(m.income - m.expense)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: readonly { payload?: unknown }[] }) {
  if (!active || !payload?.length) return null;
  const m = payload[0].payload as MonthTotals;
  const result = m.income - m.expense;
  return (
    <div className="rounded-xl border border-line bg-surface p-3 text-sm shadow-lg">
      <p className="mb-1 font-bold">{formatMonthYear(m.month)}</p>
      <p className="flex items-center gap-2">
        <span className="size-2.5 rounded-sm" style={{ background: INCOME }} aria-hidden="true" />
        Receitas: <strong>{formatCents(m.income)}</strong>
      </p>
      <p className="flex items-center gap-2">
        <span className="size-2.5 rounded-sm" style={{ background: EXPENSE }} aria-hidden="true" />
        Despesas: <strong>{formatCents(m.expense)}</strong>
      </p>
      <p className="mt-1 border-t border-line pt-1">
        Resultado: <strong>{formatSignedCents(result, result >= 0 ? 'income' : 'expense')}</strong>
      </p>
    </div>
  );
}
