import { formatCents } from '@/lib/money';
import type { CategoryTotal } from '../api';

const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 });

/**
 * RF-23: total por categoria em barras horizontais ordenadas, com nome, valor
 * e percentual escritos ao lado (a cor nunca é a única forma de identificar).
 */
export function CategoryBreakdown({ totals }: { totals: CategoryTotal[] }) {
  const max = totals[0]?.cents ?? 0;
  return (
    <ul className="flex flex-col gap-3">
      {totals.map((t) => (
        <li key={t.id ?? 'none'} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 font-semibold">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: t.color }} aria-hidden="true" />
              <span className="truncate">{t.name}</span>
            </span>
            <span className="shrink-0">
              <strong>{formatCents(t.cents)}</strong> <span className="text-muted">· {percent.format(t.share)}</span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-ground" aria-hidden="true">
            <div className="h-2 rounded-full" style={{ width: `${max ? Math.max((t.cents / max) * 100, 2) : 0}%`, background: t.color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
