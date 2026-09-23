import { Redirect, Stack, usePathname } from 'expo-router';

import { useMyMerchant, useSession } from '@/features/auth/hooks';
import { useStaffSessionStore } from '@/stores/staff-session';
import { colors } from '@/theme';

export default function MerchantLayout() {
  const session = useSession();
  const { data: merchant, isPending } = useMyMerchant();
  const pathname = usePathname();
  const staffSession = useStaffSessionStore((state) => state.session);

  if (!session) return <Redirect href="/(auth)/welcome" />;

  // Le rôle commerçant est une capacité dérivée (décision D2) : sans commerce,
  // ces écrans n'ont rien à afficher. On renvoie vers l'interface client
  // plutôt que d'afficher une coquille vide.
  if (!isPending && !merchant) return <Redirect href="/(client)/(tabs)" />;

  // Le mode caisse ne laisse passer que les écrans nécessaires à une opération.
  // Le mot de passe propriétaire est requis pour retrouver les réglages.
  const allowedForStaff =
    pathname === '/' ||
    pathname === '/scan' ||
    pathname.startsWith('/scanned/') ||
    pathname.startsWith('/reward/') ||
    pathname === '/owner-unlock';
  if (staffSession && !allowedForStaff) {
    return <Redirect href="/(merchant)/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="scanned/[clientCode]" />
      <Stack.Screen name="reward/[clientCode]" />
      <Stack.Screen name="customer/[clientId]" />
      <Stack.Screen name="programs/index" />
      <Stack.Screen name="programs/new" />
      <Stack.Screen name="programs/[id]" />
      <Stack.Screen name="team" />
      <Stack.Screen name="owner-unlock" />
      <Stack.Screen
        name="enroll-qr"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
    </Stack>
  );
}
