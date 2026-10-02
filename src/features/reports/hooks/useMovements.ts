import { useQuery } from '@tanstack/react-query';
import { addMonths, monthRange, toISODate } from '@/lib/dates';
import { listMovements } from '../api';

/** Receitas e despesas dos `months` meses que terminam em `lastMonth`, mais `monthsAhead` meses depois dele. */
export function useMovements(lastMonth: Date, months: number, monthsAhead = 0) {
  const from = toISODate(addMonths(lastMonth, -(months - 1)));
  const { end } = monthRange(addMonths(lastMonth, monthsAhead));
  return useQuery({
    queryKey: ['movements', from, end],
    queryFn: () => listMovements(from, end),
  });
}
