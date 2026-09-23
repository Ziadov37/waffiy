import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useUserId } from '@/features/auth/hooks';
import { queryKeys } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';

/**
 * Tient les cartes et les notifications du client à jour en direct.
 *
 * Le client consulte souvent sa carte à l'instant même où le commerçant
 * scanne : sans cet abonnement, il lirait 8/10 pendant qu'on lui annonce 9/10.
 *
 * On invalide plutôt que d'appliquer la charge utile reçue. La charge d'un
 * message temps réel ne contient que la ligne modifiée, pas le programme
 * associé ni le seuil ; reconstruire la carte à partir de là dupliquerait la
 * logique de fetchCards et finirait par en diverger.
 */
export function useClientRealtime(): void {
  const queryClient = useQueryClient();
  const userId = useUserId();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`client:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'memberships',
          filter: `profile_id=eq.${userId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.cards });
          void queryClient.invalidateQueries({ queryKey: queryKeys.rewards });
        },
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'programs' }, () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.cards });
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `profile_id=eq.${userId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
          void queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);
}
