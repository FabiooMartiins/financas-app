import { useMutation, useQuery } from '@tanstack/react-query';
import { refreshAll } from '@/lib/queryClient';
import { createCategory, deleteCategory, listCategories, updateCategory, type CategoryInput } from '../api';

export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: listCategories, staleTime: 5 * 60_000 });
}

export function useSaveCategory() {
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: CategoryInput }) => (id ? updateCategory(id, input) : createCategory(input)),
    onSuccess: refreshAll,
  });
}

export function useDeleteCategory() {
  return useMutation({ mutationFn: deleteCategory, onSuccess: refreshAll });
}
