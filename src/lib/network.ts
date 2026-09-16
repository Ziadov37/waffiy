import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

/**
 * Branche TanStack Query sur l'état réseau réel de l'appareil.
 *
 * Par défaut, TanStack Query se fie à `navigator.onLine`, qui n'existe pas en
 * React Native : sans ce branchement, il se croit toujours en ligne et relance
 * des requêtes vouées à échouer. Le commerçant en sous-sol verrait alors des
 * erreurs en boucle plutôt qu'un état hors ligne franc.
 *
 * `isInternetReachable` plutôt que `isConnected` : un téléphone accroché à un
 * Wi-Fi de restaurant sans accès réellement fonctionnel est « connecté » mais
 * ne joindra pas Supabase.
 */
export function startNetworkWatcher(): void {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    }),
  );
}

export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}
