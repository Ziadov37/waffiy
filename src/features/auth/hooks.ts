import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-client';
import { clearQueue } from '@/lib/offline/queue';
import { useSessionStore } from '@/stores/session';
import { useStaffSessionStore } from '@/stores/staff-session';
import {
  fetchMyMerchant,
  fetchProfile,
  confirmGuestAccountLink,
  finishGuestAccountUpgrade,
  requestPasswordReset,
  requestPhoneVerification,
  resendPhoneCode,
  resendSignupCode,
  resendGuestAccountCode,
  signInWithPassword,
  signInAnonymously,
  signOut,
  signUpWithPassword,
  startGuestAccountUpgrade,
  updatePassword,
  updateProfile,
  verifySignupCode,
  verifyGuestAccountEmail,
  verifyPhoneCode,
  type SignUpMetadata,
} from './api';

export function useSession() {
  return useSessionStore((s) => s.session);
}

export function useUserId(): string | null {
  return useSessionStore((s) => s.session?.user.id ?? null);
}

export function useIsAnonymous(): boolean {
  return Boolean(useSessionStore((state) => state.session?.user.is_anonymous));
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

export function useSignUpWithPassword() {
  return useMutation({
    mutationFn: (input: { email: string; password: string; metadata: SignUpMetadata }) =>
      signUpWithPassword(input.email, input.password, input.metadata),
  });
}

export function useAnonymousSignIn() {
  const queryClient = useQueryClient();
  const setSession = useSessionStore((state) => state.setSession);
  return useMutation({
    mutationFn: signInAnonymously,
    onSuccess: (session) => {
      // `onAuthStateChange` est asynchrone. Sur certains navigateurs mobiles,
      // la navigation vers la carte peut donc commencer avant que le store ne
      // connaisse la session invitée : les requêtes restent alors désactivées
      // et l'écran affiche « Chargement… » indéfiniment. Écrire la session
      // retournée par Supabase ferme cette course avant de quitter /join.
      setSession(session);
      void queryClient.invalidateQueries();
    },
  });
}

export function useStartGuestAccountUpgrade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: startGuestAccountUpgrade,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.profile }),
  });
}

export function useVerifyGuestAccountEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; token: string }) =>
      verifyGuestAccountEmail(input.email, input.token),
    onSuccess: () => void queryClient.invalidateQueries(),
  });
}

export function useResendGuestAccountCode() {
  return useMutation({ mutationFn: resendGuestAccountCode });
}

export function useConfirmGuestAccountLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: confirmGuestAccountLink,
    onSuccess: () => void queryClient.invalidateQueries(),
  });
}

export function useFinishGuestAccountUpgrade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: finishGuestAccountUpgrade,
    onSuccess: () => void queryClient.invalidateQueries(),
  });
}

export function useRequestPhoneVerification() {
  return useMutation({ mutationFn: requestPhoneVerification });
}

export function useRequestPasswordReset() {
  return useMutation({ mutationFn: requestPasswordReset });
}

export function useUpdatePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePassword,
    onSuccess: () => void queryClient.invalidateQueries(),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (profile) => queryClient.setQueryData(queryKeys.profile, profile),
  });
}

export function useVerifyPhoneCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { phone: string; token: string }) =>
      verifyPhoneCode(input.phone, input.token),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.profile }),
  });
}

export function useResendPhoneCode() {
  return useMutation({ mutationFn: resendPhoneCode });
}

export function useVerifySignupCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; token: string }) =>
      verifySignupCode(input.email, input.token),
    onSuccess: () => {
      // La session change : tout ce qui a été lu sous l'ancienne identité
      // (y compris « aucun profil ») devient faux.
      void queryClient.invalidateQueries();
    },
  });
}

export function useResendSignupCode() {
  return useMutation({ mutationFn: resendSignupCode });
}

export function usePasswordLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { identifier: string; password: string }) =>
      signInWithPassword(input.identifier, input.password),
    onSuccess: () => void queryClient.invalidateQueries(),
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  const reset = useSessionStore((s) => s.reset);
  const clearStaffSession = useStaffSessionStore((s) => s.clearSession);
  return useMutation({
    mutationFn: signOut,
    onSuccess: async () => {
      // La file contient des noms et codes clients. Elle ne doit jamais être
      // rejouée sous le compte commerçant suivant sur un appareil partagé.
      await clearQueue();
      clearStaffSession();
      reset();
      // Vider plutôt qu'invalider : le cache persisté contiendrait sinon les
      // cartes et les clients du compte précédent, lisibles hors ligne.
      queryClient.clear();
    },
  });
}
