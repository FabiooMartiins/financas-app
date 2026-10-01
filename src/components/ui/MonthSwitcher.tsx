import { addMonths, formatMonthYear } from '@/lib/dates';

const arrow = (d: string) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

/** Seletor de mês civil (RN-08): ‹ setembro de 2026 › */
export function MonthSwitcher({ month, onChange }: { month: Date; onChange: (month: Date) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl border border-line bg-surface p-1">
      <button
        type="button"
        aria-label="Mês anterior"
        onClick={() => onChange(addMonths(month, -1))}
        className="flex size-11 items-center justify-center rounded-xl text-muted hover:bg-ground"
      >
        {arrow('M15 18l-6-6 6-6')}
      </button>
      <span className="font-display font-semibold" aria-live="polite">
        {formatMonthYear(month)}
      </span>
      <button
        type="button"
        aria-label="Próximo mês"
        onClick={() => onChange(addMonths(month, 1))}
        className="flex size-11 items-center justify-center rounded-xl text-muted hover:bg-ground"
      >
        {arrow('M9 18l6-6-6-6')}
      </button>
    </div>
  );
}
