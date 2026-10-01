const short = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const monthYear = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const monthAbbr = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
const weekdayDay = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });

/** "2026-09-30" -> Date local (sem problema de fuso horário) */
export function parseISODate(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** "2026-09-30" -> "30/09/2026" */
export function formatDate(isoDate: string): string {
  return short.format(parseISODate(isoDate));
}

/** "2026-09-30" -> "30/09" */
export function formatDayMonth(isoDate: string): string {
  return formatDate(isoDate).slice(0, 5);
}

/** Date -> "Setembro de 2026" */
export function formatMonthYear(date: Date): string {
  return upperFirst(monthYear.format(date));
}

function upperFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Date -> "set" */
export function formatMonthShort(date: Date): string {
  return monthAbbr.format(date).replace('.', '');
}

/** Cabeçalho de grupo na lista: "Hoje", "Ontem" ou "Qua., 30 de set." */
export function formatDayHeader(isoDate: string): string {
  const todayIso = today();
  if (isoDate === todayIso) return 'Hoje';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (isoDate === toISODate(yesterday)) return 'Ontem';
  return upperFirst(weekdayDay.format(parseISODate(isoDate)));
}

/** Primeiro e último dia do mês civil (RN-08), em ISO "aaaa-mm-dd" */
export function monthRange(date: Date): { start: string; end: string } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: toISODate(start), end: toISODate(end) };
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

/** Mesmo dia em outro mês, ajustando para o último dia quando não existe (31 -> 30) */
export function addMonthsKeepDay(isoDate: string, months: number): string {
  const d = parseISODate(isoDate);
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d.getDate(), lastDay));
  return toISODate(target);
}

export function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/** Diferença em dias (b − a) entre duas datas ISO */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / 86_400_000);
}

export function today(): string {
  return toISODate(new Date());
}

export function toISODate(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}
