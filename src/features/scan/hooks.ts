import {
  onlineManager,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-client';
import { useStaffSessionStore } from '@/stores/staff-session';
import { enqueue, readQueue, removeFromQueue } from '@/lib/offline/queue';
import { replayQueue } from '@/lib/offline/replay';
import { creditVisit, redeemReward, resolveClient, type ScanResult } from './api';

export function useResolveClient(
  merchantId: string | undefined,
  clientCode: string | undefined,
) {
  return useQuery({
    queryKey: queryKeys.scan(merchantId ?? '', clientCode ?? ''),
    queryFn: () => resolveClient(clientCode as string, merchantId as string),
    enabled: Boolean(merchantId && clientCode),
    // Le solde affiché doit être celui de l'instant : un client peut avoir été
    // scanné à une autre caisse il y a dix secondes.
    staleTime: 0,
    retry: false,
  });
}

export type ScanMutationInput = {
  /**
   * Générée par l'écran avant le premier envoi, puis réutilisée par son bouton
   * « Réessayer ». Une nouvelle clé après une réponse réseau perdue pourrait
   * créditer deux fois une action déjà enregistrée par le serveur.
   */
  requestId: string;
  merchantId: string;
  clientCode: string;
  clientName: string;
  programId: string;
  programName: string;
  quantity?: number;
};

export type ScanMutationResult =
  { status: 'done'; result: ScanResult } | { status: 'queued'; requestId: string };

/**
 * Crédite une visite, ou met l'intention en file si l'appareil est hors ligne.
 *
 * La clé d'idempotence est générée AVANT l'envoi et conservée : si la réponse
 * se perd alors que le serveur a bien écrit, le rejeu renverra la transaction
 * existante au lieu de créditer une seconde fois.
 */
export function useCreditVisit() {
  return useScanMutation('credit');
}

export function useRedeemReward() {
  return useScanMutation('redeem');
}

function useScanMutation(kind: 'credit' | 'redeem') {
  const queryClient = useQueryClient();
  const staffSessionToken = useStaffSessionStore((state) => state.session?.token);

  return useMutation<ScanMutationResult, Error, ScanMutationInput>({
    mutationFn: async (input) => {
      if (!onlineManager.isOnline()) {
        await enqueue({
          requestId: input.requestId,
          kind,
          merchantId: input.merchantId,
          programId: input.programId,
          programName: input.programName,
          clientCode: input.clientCode,
          clientName: input.clientName,
          quantity: input.quantity ?? 1,
          staffSessionToken,
        });
        return { status: 'queued', requestId: input.requestId };
      }

      const call = kind === 'credit' ? creditVisit : redeemReward;
      const result = await call({
        clientCode: input.clientCode,
        programId: input.programId,
        requestId: input.requestId,
        quantity: input.quantity ?? 1,
        staffSessionToken: staffSessionToken ?? null,
      });
      return { status: 'done', result };
    },

    onSuccess: (_result, input) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.scan(input.merchantId, input.clientCode),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.activity(input.merchantId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.stats(input.merchantId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.customers(input.merchantId),
      });
      void queryClient.invalidateQueries({ queryKey: ['offline-queue'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.cards });
      void queryClient.invalidateQueries({ queryKey: queryKeys.rewards });
    },
  });
}

export function usePendingActions() {
  return useQuery({
    queryKey: ['offline-queue'] as const,
    queryFn: readQueue,
    // Volontairement court : la file change hors de TanStack Query, depuis le
    // rejeu déclenché par le retour du réseau.
    staleTime: 2000,
  });
}

export function useReplayQueue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: replayQueue,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['offline-queue'] });
      void queryClient.invalidateQueries({ queryKey: ['activity'] });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useDiscardPendingAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeFromQueue,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['offline-queue'] });
    },
  });
}
