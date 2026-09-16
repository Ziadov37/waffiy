import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-client';
import { useUserId } from '@/features/auth/hooks';
import { fetchCards, fetchUsedRewards, joinMerchant, type Card } from './api';

export function useCards() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.cards,
    queryFn: fetchCards,
    enabled: Boolean(userId),
  });
}

/** Une carte précise, servie depuis la liste déjà en cache quand elle y est. */
export function useCard(merchantId: string | undefined) {
  const { data, ...rest } = useCards();
  const card: Card | undefined = merchantId
    ? data?.find((c) => c.merchantId === merchantId)
    : undefined;
  return { ...rest, data: card, cards: data };
}

export function useUsedRewards() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.rewards,
    queryFn: fetchUsedRewards,
    enabled: Boolean(userId),
  });
}

export function useJoinMerchant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: joinMerchant,
    onSuccess: () => {
      // La carte doit apparaître immédiatement après le scan : c'est tout
      // l'intérêt du geste.
      void queryClient.invalidateQueries({ queryKey: queryKeys.cards });
    },
  });
}
