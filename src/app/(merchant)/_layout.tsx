import { Redirect, Stack } from 'expo-router';

import { useMyMerchant, useSession } from '@/features/auth/hooks';
import { colors } from '@/theme';

export default function MerchantLayout() {
  const session = useSession();
  const { data: merchant, isPending } = useMyMerchant();

  if (!session) return <Redirect href="/(auth)/welcome" />;

  // Le rôle commerçant est une capacité dérivée (décision D2) : sans commerce,
  // ces écrans n'ont rien à afficher. On renvoie vers l'interface client
  // plutôt que d'afficher une coquille vide.
  if (!isPending && !merchant) return <Redirect href="/(client)" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal' }} />
    </Stack>
  );
}
