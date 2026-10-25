import { useQuery } from '@tanstack/react-query';
import { addMonths, monthRange, toISODate } from '@/lib/dates';
import { listMovements } from '../api';

/** Receitas e despesas dos `months` meses que terminam em `lastMonth`. */
export function useMovements(lastMonth: Date, months: number) {
  const from = toISODate(addMonths(lastMonth, -(months - 1)));
  const { end } = monthRange(lastMonth);
  return useQuery({
    queryKey: ['movements', from, end],
    queryFn: () => listMovements(from, end),
  });
}
