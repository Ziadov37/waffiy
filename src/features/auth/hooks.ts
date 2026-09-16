import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-client';
import { useSessionStore } from '@/stores/session';
import {
  fetchMyMerchant,
  fetchProfile,
  requestEmailCode,
  signOut,
  verifyEmailCode,
  type SignUpMetadata,
} from './api';

export function useSession() {
  return useSessionStore((s) => s.session);
}

export function useUserId(): string | null {
  return useSessionStore((s) => s.session?.user.id ?? null);
}

export function useProfile() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: fetchProfile,
    enabled: Boolean(userId),
  });
}

/** `data === null` signifie « ce compte n'exploite aucun commerce ». */
export function useMyMerchant() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.merchant,
    queryFn: () => fetchMyMerchant(userId as string),
    enabled: Boolean(userId),
  });
}

export function useRequestEmailCode() {
  return useMutation({
    mutationFn: (input: { email: string; createUser: boolean; metadata?: SignUpMetadata }) =>
      requestEmailCode(input.email, {
        createUser: input.createUser,
        ...(input.metadata ? { metadata: input.metadata } : {}),
      }),
  });
}

export function useVerifyEmailCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; token: string }) =>
      verifyEmailCode(input.email, input.token),
    onSuccess: () => {
      // La session change : tout ce qui a été lu sous l'ancienne identité
      // (y compris « aucun profil ») devient faux.
      void queryClient.invalidateQueries();
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  const reset = useSessionStore((s) => s.reset);
  return useMutation({
    mutationFn: signOut,
    onSuccess: () => {
      reset();
      // Vider plutôt qu'invalider : le cache persisté contiendrait sinon les
      // cartes et les clients du compte précédent, lisibles hors ligne.
      queryClient.clear();
    },
  });
}
