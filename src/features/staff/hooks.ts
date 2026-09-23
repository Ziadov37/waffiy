import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMerchantId } from '@/features/merchant/hooks';
import { queryKeys } from '@/lib/query-client';
import { useStaffSessionStore } from '@/stores/staff-session';
import {
  changeMerchantStaffPin,
  closeMerchantStaffSession,
  confirmOwnerPassword,
  createMerchantStaff,
  fetchMerchantStaff,
  openMerchantStaffSession,
  setMerchantStaffActive,
} from './api';

export function useMerchantStaff() {
  const merchantId = useMerchantId();
  return useQuery({
    queryKey: queryKeys.staff(merchantId ?? ''),
    queryFn: () => fetchMerchantStaff(merchantId as string),
    enabled: Boolean(merchantId),
  });
}

function useInvalidateStaff() {
  const merchantId = useMerchantId();
  const client = useQueryClient();
  return () => void client.invalidateQueries({ queryKey: queryKeys.staff(merchantId ?? '') });
}

export function useCreateMerchantStaff() {
  const merchantId = useMerchantId();
  const invalidate = useInvalidateStaff();
  return useMutation({
    mutationFn: (input: { name: string; pin: string }) =>
      createMerchantStaff({ merchantId: merchantId as string, ...input }),
    onSuccess: invalidate,
  });
}

export function useSetMerchantStaffActive() {
  const invalidate = useInvalidateStaff();
  return useMutation({ mutationFn: setMerchantStaffActive, onSuccess: invalidate });
}

export function useChangeMerchantStaffPin() {
  const invalidate = useInvalidateStaff();
  return useMutation({ mutationFn: changeMerchantStaffPin, onSuccess: invalidate });
}

export function useOpenMerchantStaffSession() {
  const merchantId = useMerchantId();
  const setSession = useStaffSessionStore((state) => state.setSession);
  return useMutation({
    mutationFn: (pin: string) =>
      openMerchantStaffSession({ merchantId: merchantId as string, pin }),
    onSuccess: setSession,
  });
}

export function useUnlockOwner() {
  const session = useStaffSessionStore((state) => state.session);
  const clearSession = useStaffSessionStore((state) => state.clearSession);
  return useMutation({
    mutationFn: async (password: string) => {
      await confirmOwnerPassword(password);
      if (session?.token) await closeMerchantStaffSession(session.token);
    },
    onSuccess: clearSession,
  });
}
