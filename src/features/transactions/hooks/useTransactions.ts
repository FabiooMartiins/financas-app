import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { refreshAll } from '@/lib/queryClient';
import {
  createInstallments,
  createTransaction,
  deleteTransaction,
  getTransaction,
  listTransactions,
  PAGE_SIZE,
  updateTransaction,
  type TransactionFilters,
  type TransactionInput,
} from '../api';

export function useTransactions(filters: TransactionFilters) {
  return useInfiniteQuery({
    queryKey: ['transactions', filters],
    queryFn: ({ pageParam }) => listTransactions(filters, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => (lastPage.length === PAGE_SIZE ? pages.length : undefined),
  });
}

export function useTransaction(id: string | undefined) {
  return useQuery({
    queryKey: ['transaction', id],
    queryFn: () => getTransaction(id!),
    enabled: !!id,
  });
}

export function useCreateTransaction() {
  return useMutation({
    mutationFn: async ({ input, installments }: { input: TransactionInput; installments: number }) => {
      if (installments > 1) await createInstallments(input, installments);
      else await createTransaction(input);
    },
    onSuccess: refreshAll,
  });
}

export function useUpdateTransaction() {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<TransactionInput> }) => updateTransaction(id, input),
    onSuccess: refreshAll,
  });
}

export function useDeleteTransaction() {
  return useMutation({ mutationFn: deleteTransaction, onSuccess: refreshAll });
}
