import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

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
declare global {
  // Expo Web recharge les modules pendant le développement. Conserver le
  // client sur globalThis évite plusieurs GoTrueClient partageant le même
  // stockage et se bloquant mutuellement sur le verrou de session.
  var __waffiySupabase: SupabaseClient<Database> | undefined;
}

export const supabase =
  globalThis.__waffiySupabase ??
  createClient<Database>(
    env.EXPO_PUBLIC_SUPABASE_URL,
    env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        storage: secureStorage,
        autoRefreshToken: true,
        persistSession: true,
        // La confirmation d'inscription se fait par code à 6 chiffres saisi dans
        // l'application, puis les connexions utilisent le mot de passe. Aucun de
        // ces flux ne crée de session dans l'URL.
        detectSessionInUrl: false,
      },
      global: {
        headers: { 'x-application-name': 'waffiy-mobile' },
      },
    },
  );

globalThis.__waffiySupabase = supabase;

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
