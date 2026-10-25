import { formatCents, formatSignedCents } from '@/lib/money';
import type { MonthPlan, PlanLine, PlanMode } from '../planning';

const explanation: Record<PlanMode, string> = {
  cash: 'O que entra e sai das suas contas no mês. O cartão entra pelo valor da fatura que vence no mês, não pela data de cada compra.',
  consumption: 'Cada compra conta no mês em que foi feita, inclusive no cartão e em cada parcela. Pagamento de fatura não entra (RN-02).',
};

/** Entradas, saídas e diferença do mês, separando o que já aconteceu do que está previsto. */
export function MonthPlanCard({ plan, mode }: { plan: MonthPlan; mode: PlanMode }) {
  const diff = plan.totalIncome - plan.totalExpense;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{explanation[mode]}</p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Total label="Vai entrar" cents={plan.totalIncome} done={plan.doneIncome} tone="text-income" />
        <Total label="Vai sair" cents={plan.totalExpense} done={plan.doneExpense} tone="text-expense" />
        <div className={`col-span-2 rounded-2xl p-4 lg:col-span-1 ${diff >= 0 ? 'bg-brand text-on-brand' : 'bg-expense-soft text-expense'}`}>
          <p className="text-sm font-semibold opacity-90">{diff >= 0 ? 'Sobra prevista' : 'Falta prevista'}</p>
          <p className="font-display text-2xl font-semibold break-words">{formatSignedCents(diff, diff >= 0 ? 'income' : 'expense')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Lines title="Entradas" lines={plan.income} empty="Nada lançado ou previsto para entrar." />
        <Lines title="Saídas" lines={plan.expense} empty="Nada lançado ou previsto para sair." />
      </div>
    </div>
  );
}

function Total({ label, cents, done, tone }: { label: string; cents: number; done: number; tone: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-line bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className={`font-display text-lg font-semibold break-words ${tone}`}>{formatCents(cents)}</p>
      {done !== cents && <p className="text-xs text-muted">{formatCents(done)} já aconteceu</p>}
    </div>
  );
}

function Lines({ title, lines, empty }: { title: string; lines: PlanLine[]; empty: string }) {
  return (
    <section className="flex min-w-0 flex-col gap-1">
      <h3 className="text-sm font-bold text-muted">{title}</h3>
      {lines.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-line">
          {lines.map((line, i) => (
            <li key={`${i}-${line.label}`} className="flex min-h-11 items-center justify-between gap-3 py-2 text-sm">
              <span className="min-w-0">
                {line.label}
                {line.planned && <span className="ml-2 rounded-full bg-ground px-2 py-0.5 text-xs font-bold text-muted">previsto</span>}
              </span>
              <span className="shrink-0 font-semibold">{line.cents < 0 ? `− ${formatCents(-line.cents)}` : formatCents(line.cents)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
