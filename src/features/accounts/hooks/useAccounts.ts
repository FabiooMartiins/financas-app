import { useMutation, useQuery } from '@tanstack/react-query';
import { refreshAll } from '@/lib/queryClient';
import {
  adjustBalance,
  createAccount,
  deleteAccount,
  listAccounts,
  setAccountLogo,
  updateAccount,
  type Account,
  type AccountInput,
  type AdjustMode,
} from '../api';

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

export function useAdjustBalance() {
  return useMutation({
    mutationFn: ({ account, realCents, mode }: { account: Account; realCents: number; mode: AdjustMode }) =>
      adjustBalance(account, realCents, mode),
    onSuccess: refreshAll,
  });
}

export function useSetAccountLogo() {
  return useMutation({
    mutationFn: ({ id, logoPath }: { id: string; logoPath: string | null }) => setAccountLogo(id, logoPath),
    onSuccess: refreshAll,
  });
}
