import { useMutation, useQuery } from '@tanstack/react-query';
import { refreshAll } from '@/lib/queryClient';
import { createAccount, deleteAccount, listAccounts, updateAccount, type AccountInput } from '../api';

export function useAccounts() {
  return useQuery({ queryKey: ['accounts'], queryFn: listAccounts });
}

export function useSaveAccount() {
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: AccountInput }) => (id ? updateAccount(id, input) : createAccount(input)),
    onSuccess: refreshAll,
  });
}

export function useDeleteAccount() {
  return useMutation({ mutationFn: deleteAccount, onSuccess: refreshAll });
}
