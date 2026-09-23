import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { Platform } from 'react-native';

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
 *
 * Sur le web, NetInfo teste la joignabilité par `HEAD /` sur l'origine du
 * site. Sur GitHub Pages (`seifbgr.github.io/waffiy-web`), la racine répond
 * 404 : NetInfo conclut « hors ligne », TanStack Query met les mutations en
 * pause et « Ajouter ma carte » expire sans jamais appeler Supabase. La
 * mutation en pause, persistée, repart plus tard : la carte apparaît côté
 * commerçant alors que le client a vu une erreur. Le navigateur expose déjà
 * `navigator.onLine`, que TanStack Query écoute par défaut : on s'y tient.
 */
export function startNetworkWatcher(): void {
  if (Platform.OS === 'web') return;
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    }),
  );
}

export async function isOnline(): Promise<boolean> {
  if (Platform.OS === 'web') return typeof navigator === 'undefined' || navigator.onLine;
  const state = await NetInfo.fetch();
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}
