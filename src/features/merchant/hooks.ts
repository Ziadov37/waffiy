import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMyMerchant } from '@/features/auth/hooks';
import { queryKeys } from '@/lib/query-client';
import {
  createProgram,
  deleteProgram,
  fetchActivity,
  fetchCustomer,
  fetchCustomerHistory,
  fetchCustomerProgress,
  fetchCustomers,
  fetchProgramMemberCounts,
  fetchPrograms,
  fetchStats,
  fetchThresholdImpact,
  setProgramThreshold,
  updateMerchantDetails,
  updateProgram,
  uploadMerchantLogo,
  type ActivityFilter,
  type CustomerFilter,
  type ProgramInput,
  type ProgramStatus,
} from './api';

/** Identifiant du commerce exploité, ou undefined tant qu'il n'est pas connu. */
export function useMerchantId(): string | undefined {
  const { data } = useMyMerchant();
  return data?.id;
}

export function useStats() {
  const merchantId = useMerchantId();
  return useQuery({
    queryKey: queryKeys.stats(merchantId ?? ''),
    queryFn: () => fetchStats(merchantId as string),
    enabled: Boolean(merchantId),
  });
}

export function useActivity(
  options: { filter?: ActivityFilter; todayOnly?: boolean } = {},
) {
  const merchantId = useMerchantId();
  const { filter = 'all', todayOnly = false } = options;
  return useQuery({
    queryKey: [...queryKeys.activity(merchantId ?? ''), filter, todayOnly] as const,
    queryFn: () => fetchActivity(merchantId as string, { filter, todayOnly }),
    enabled: Boolean(merchantId),
  });
}

export function useCustomers(filter: CustomerFilter = 'all') {
  const merchantId = useMerchantId();
  return useQuery({
    queryKey: [...queryKeys.customers(merchantId ?? ''), filter] as const,
    queryFn: () => fetchCustomers(merchantId as string, filter),
    enabled: Boolean(merchantId),
  });
}

export function useCustomerDetail(profileId: string | undefined) {
  const merchantId = useMerchantId();
  return useQuery({
    queryKey: queryKeys.customer(merchantId ?? '', profileId ?? ''),
    queryFn: async () => {
      const [customer, history, progress] = await Promise.all([
        fetchCustomer(merchantId as string, profileId as string),
        fetchCustomerHistory(merchantId as string, profileId as string),
        fetchCustomerProgress(merchantId as string, profileId as string),
      ]);
      return { customer, history, progress };
    },
    enabled: Boolean(merchantId && profileId),
  });
}

export function usePrograms() {
  const merchantId = useMerchantId();
  return useQuery({
    queryKey: queryKeys.programs(merchantId ?? ''),
    queryFn: async () => {
      const [programs, counts] = await Promise.all([
        fetchPrograms(merchantId as string),
        fetchProgramMemberCounts(merchantId as string),
      ]);
      return programs.map((p) => ({ ...p, memberCount: counts[p.id] ?? 0 }));
    },
    enabled: Boolean(merchantId),
  });
}

export function useUpdateMerchantDetails() {
  const merchantId = useMerchantId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Parameters<typeof updateMerchantDetails>[1]) =>
      updateMerchantDetails(merchantId as string, patch),
    onSuccess: (merchant) => {
      queryClient.setQueryData(queryKeys.merchant, merchant);
      void queryClient.invalidateQueries({ queryKey: queryKeys.cards });
    },
  });
}

export function useUploadMerchantLogo() {
  const merchantId = useMerchantId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { uri: string; mimeType: string }) =>
      uploadMerchantLogo(merchantId as string, input.uri, input.mimeType),
    onSuccess: (merchant) => {
      queryClient.setQueryData(queryKeys.merchant, merchant);
      void queryClient.invalidateQueries({ queryKey: queryKeys.cards });
    },
  });
}

function useInvalidatePrograms() {
  const queryClient = useQueryClient();
  const merchantId = useMerchantId();
  return () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.programs(merchantId ?? ''),
    });
    // Un programme publié, archivé ou renommé change ce que voient les clients.
    void queryClient.invalidateQueries({ queryKey: queryKeys.cards });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.customers(merchantId ?? ''),
    });
    void queryClient.invalidateQueries({ queryKey: ['scan', merchantId ?? ''] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.stats(merchantId ?? '') });
  };
}

export function useCreateProgram() {
  const merchantId = useMerchantId();
  const invalidate = useInvalidatePrograms();
  return useMutation({
    mutationFn: (input: { program: ProgramInput; status: ProgramStatus }) =>
      createProgram(merchantId as string, input.program, input.status),
    onSuccess: invalidate,
  });
}

export function useUpdateProgram() {
  const invalidate = useInvalidatePrograms();
  return useMutation({
    mutationFn: (input: Parameters<typeof updateProgram>[1] & { id: string }) => {
      const { id, ...patch } = input;
      return updateProgram(id, patch);
    },
    onSuccess: invalidate,
  });
}

export function useDeleteProgram() {
  const invalidate = useInvalidatePrograms();
  return useMutation({ mutationFn: deleteProgram, onSuccess: invalidate });
}

export function useThresholdImpact(programId: string | undefined, threshold: number) {
  return useQuery({
    queryKey: ['threshold-impact', programId, threshold] as const,
    queryFn: () => fetchThresholdImpact(programId as string, threshold),
    enabled: Boolean(programId),
    // Interrogé à chaque frappe sur le sélecteur : la fonction ne modifie
    // rien, mais inutile de la rappeler pour une valeur déjà connue.
    staleTime: 30_000,
  });
}

export function useSetThreshold() {
  const invalidate = useInvalidatePrograms();
  return useMutation({
    mutationFn: (input: { programId: string; threshold: number; confirmed: boolean }) =>
      setProgramThreshold(input.programId, input.threshold, input.confirmed),
    onSuccess: invalidate,
  });
}
