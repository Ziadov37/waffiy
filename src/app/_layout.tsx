import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { startNetworkWatcher } from '@/lib/network';
import { queryClient, queryPersister } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';
import { useSessionStore } from '@/stores/session';
import { colors } from '@/theme';

// L'écran de démarrage reste visible jusqu'à ce que les polices ET la session
// soient prêtes : sans cela, l'application afficherait un instant l'accueil
// non connecté à un utilisateur qui l'est, puis sauterait vers ses cartes.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  const setSession = useSessionStore((s) => s.setSession);
  const setHydrated = useSessionStore((s) => s.setHydrated);
  const hydrated = useSessionStore((s) => s.hydrated);

  // État dérivé, pas un état à stocker : le calculer évite un rendu en cascade.
  // fontError compte autant que fontsLoaded — si Manrope ne se charge pas, il
  // vaut mieux une police système qu'un écran de démarrage indéfini.
  const ready = (fontsLoaded || Boolean(fontError)) && hydrated;
  const splashHidden = useRef(false);

  useEffect(() => {
    startNetworkWatcher();

    // getSession() relit la session chiffrée sur disque ; onAuthStateChange
    // couvre ensuite la connexion, la déconnexion et les rafraîchissements de
    // jeton. Les deux sont nécessaires : le second ne se déclenche pas au
    // démarrage pour une session déjà valide.
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setHydrated(true);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setHydrated(true);
    });

    return () => subscription.subscription.unsubscribe();
  }, [setSession, setHydrated]);

  useEffect(() => {
    if (ready && !splashHidden.current) {
      splashHidden.current = true;
      void SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return <View style={styles.boot} />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister: queryPersister, maxAge: 1000 * 60 * 60 * 24 }}
        >
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(client)" />
            <Stack.Screen name="(merchant)" />
          </Stack>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  boot: { flex: 1, backgroundColor: colors.primary },
});
