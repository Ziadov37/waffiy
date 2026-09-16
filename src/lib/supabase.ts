import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database.types';
import { env } from './env';
import { secureStorage } from './secure-storage';

/**
 * Client Supabase de l'application.
 *
 * Il ne porte que la clé anonyme. Toute la sécurité repose sur la RLS et sur
 * les fonctions SECURITY DEFINER : même en interceptant cette clé, on ne peut
 * ni créditer une visite, ni lire la progression d'un autre client.
 */
export const supabase = createClient<Database>(
  env.EXPO_PUBLIC_SUPABASE_URL,
  env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: secureStorage,
      autoRefreshToken: true,
      persistSession: true,
      // Pas de lien magique : la connexion se fait par code à 6 chiffres saisi
      // dans l'application. Détecter une session dans l'URL n'a donc pas lieu
      // d'être, et l'activer sur mobile provoque des faux positifs.
      detectSessionInUrl: false,
    },
    global: {
      headers: { 'x-application-name': 'waffiy-mobile' },
    },
  },
);

/**
 * Supabase rafraîchit le jeton sur une minuterie. En arrière-plan, iOS et
 * Android gèlent ces minuteries : sans cet écouteur, l'application reprend
 * avec un jeton périmé et le premier appel échoue.
 */
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      void supabase.auth.startAutoRefresh();
    } else {
      void supabase.auth.stopAutoRefresh();
    }
  });
}
