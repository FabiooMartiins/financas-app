const short = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const monthYear = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });

/** "2026-09-30" -> "30/09/2026" (sem problema de fuso horário) */
export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return short.format(new Date(y, m - 1, d));
}

/** Date -> "setembro de 2026" */
export function formatMonthYear(date: Date): string {
  return monthYear.format(date);
}

/** Primeiro e último dia do mês civil (RN-08), em ISO "aaaa-mm-dd" */
export function monthRange(date: Date): { start: string; end: string } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: toISODate(start), end: toISODate(end) };
}

export function toISODate(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}
