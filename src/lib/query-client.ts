import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';

/**
 * Configuration de TanStack Query.
 *
 * Deux partis pris dictés par l'usage réel :
 *
 * 1. Les données sont persistées sur disque. Le commerçant qui ouvre
 *    l'application en sous-sol doit voir sa liste de clients et ses
 *    programmes, même sans réseau — un écran vide serait pire qu'inutile.
 *
 * 2. Les mutations ne sont JAMAIS retentées automatiquement. Un crédit de
 *    visite est une action à effet, protégée par une clé d'idempotence côté
 *    serveur ; le rejeu est piloté explicitement par la file hors ligne, pas
 *    par une politique de réessai aveugle.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Les soldes changent au rythme des scans, pas à la seconde.
      staleTime: 30_000,
      gcTime: 1000 * 60 * 60 * 24, // 24 h : survit à une fermeture de l'application
      retry: (failureCount, error) => {
        // Inutile d'insister sur un refus métier : le serveur ne changera pas d'avis.
        const message = error instanceof Error ? error.message : '';
        if (/FORBIDDEN|NOT_FOUND|NOT_ENROLLED|RATE_LIMITED/.test(message)) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'waffiy.query-cache.points-v2',
  // Au-delà, on préfère repartir d'un cache vide plutôt que de bloquer le
  // démarrage sur la désérialisation d'un cache obèse.
  throttleTime: 2000,
});

/** Clés de cache centralisées : évite les invalidations manquées. */
export const queryKeys = {
  session: ['session'] as const,
  profile: ['profile'] as const,
  cards: ['cards'] as const,
  card: (merchantId: string) => ['cards', merchantId] as const,
  publicMerchant: (joinCode: string) => ['public-merchant', joinCode] as const,
  notifications: ['notifications'] as const,
  unreadCount: ['notifications', 'unread'] as const,
  rewards: ['rewards'] as const,
  merchant: ['merchant'] as const,
  programs: (merchantId: string) => ['programs', merchantId] as const,
  staff: (merchantId: string) => ['staff', merchantId] as const,
  customers: (merchantId: string) => ['customers', merchantId] as const,
  customer: (merchantId: string, profileId: string) =>
    ['customers', merchantId, profileId] as const,
  activity: (merchantId: string) => ['activity', merchantId] as const,
  stats: (merchantId: string) => ['stats', merchantId] as const,
  scan: (merchantId: string, code: string) => ['scan', merchantId, code] as const,
} as const;
