import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUserId } from '@/features/auth/hooks';
import { queryKeys } from '@/lib/query-client';
import { fetchNotifications, fetchUnreadCount, markAllRead } from './api';

export function useNotifications() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: fetchNotifications,
    enabled: Boolean(userId),
  });
}

export function useUnreadCount() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.unreadCount,
    queryFn: fetchUnreadCount,
    enabled: Boolean(userId),
    // Alimente la pastille de la barre d'onglets : on tolère une valeur
    // légèrement périmée plutôt que d'interroger le serveur en permanence.
    staleTime: 60_000,
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      void queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount });
    },
  });
}
