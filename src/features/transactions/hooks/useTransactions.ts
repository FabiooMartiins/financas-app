import { useQuery } from '@tanstack/react-query';
import { listTransactions, type TransactionFilters } from '../api';

export function useTransactions(filters: TransactionFilters) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => listTransactions(filters),
  });
}
