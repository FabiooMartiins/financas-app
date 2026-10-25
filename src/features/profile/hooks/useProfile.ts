import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { getProfile, saveProfile, type Profile } from '../api';

export function useProfile() {
  return useQuery({ queryKey: ['profile'], queryFn: getProfile, staleTime: 5 * 60_000 });
}

export function useSaveProfile() {
  return useMutation({
    mutationFn: (profile: Partial<Profile>) => saveProfile(profile),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile'] }),
  });
}
