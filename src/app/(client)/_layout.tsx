import { Redirect, Stack } from 'expo-router';

import { useSession } from '@/features/auth/hooks';
import { useClientRealtime } from '@/features/cards/realtime';
import { colors } from '@/theme';

export default function ClientLayout() {
  const session = useSession();

  // Abonné une seule fois pour tout le parcours client : chaque écran
  // consomme ensuite le cache, déjà à jour.
  useClientRealtime();

  // Garde de route. La RLS protège déjà les données ; cette garde évite
  // seulement d'afficher des écrans vides à un utilisateur déconnecté.
  if (!session) return <Redirect href="/(auth)/welcome" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      {/* Le QR s'ouvre par-dessus tout le reste : c'est ce qui permet de
          l'atteindre en un seul appui depuis n'importe quel écran. */}
      <Stack.Screen
        name="qr"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="scan-merchant" options={{ presentation: 'modal' }} />
      <Stack.Screen name="secure-account" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
