// Dias úteis bancários: sem sábado, domingo e feriados nacionais.
// Carnaval e Corpus Christi não são feriados por lei, mas os bancos não abrem (calendário Febraban),
// então vencimento nesses dias também passa para o dia útil seguinte.
import { parseISODate, toISODate } from './dates';

const fixedHolidays = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '12-25'];

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). */
function easter(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

const cache = new Map<number, Set<string>>();

/** Feriados nacionais (e dias sem expediente bancário) do ano, em ISO. */
export function bankHolidays(year: number): Set<string> {
  let holidays = cache.get(year);
  if (holidays) return holidays;
  const fromEaster = (days: number) => {
    const date = easter(year);
    date.setDate(date.getDate() + days);
    return toISODate(date);
  };
  holidays = new Set([
    ...fixedHolidays.map((md) => `${year}-${md}`),
    // Consciência Negra: feriado nacional desde 2024 (Lei 14.759/2023)
    ...(year >= 2024 ? [`${year}-11-20`] : []),
    fromEaster(-48), // segunda de Carnaval
    fromEaster(-47), // terça de Carnaval
    fromEaster(-2), // Sexta-feira Santa
    fromEaster(60), // Corpus Christi
  ]);
  cache.set(year, holidays);
  return holidays;
}

export function isBusinessDay(isoDate: string): boolean {
  const weekday = parseISODate(isoDate).getDay();
  return weekday !== 0 && weekday !== 6 && !bankHolidays(Number(isoDate.slice(0, 4))).has(isoDate);
}

/** A própria data, se for dia útil; senão o próximo dia útil. */
export function nextBusinessDay(isoDate: string): string {
  const date = parseISODate(isoDate);
  while (!isBusinessDay(toISODate(date))) date.setDate(date.getDate() + 1);
  return toISODate(date);
}
