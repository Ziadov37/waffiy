import { Redirect } from 'expo-router';

import { useMyMerchant, useSession } from '@/features/auth/hooks';
import { useSessionStore } from '@/stores/session';
import { Screen, Text } from '@/components/ui';

/**
 * Aiguillage du démarrage.
 *
 * Le rôle n'étant pas une colonne du compte (décision D2), il se déduit :
 * un utilisateur qui possède un commerce peut voir les deux interfaces, et
 * `activeRole` mémorise laquelle il consultait en dernier.
 */
export default function Index() {
  const session = useSession();
  const activeRole = useSessionStore((s) => s.activeRole);
  const { data: merchant, isPending } = useMyMerchant();

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  // Tant que l'on ignore si ce compte exploite un commerce, on ne peut pas
  // choisir l'interface. Rediriger trop tôt provoquerait un aller-retour visible.
  if (isPending) {
    return (
      <Screen>
        <Text tone="secondary">Chargement…</Text>
      </Screen>
    );
  }

  if (merchant && activeRole === 'merchant') {
    return <Redirect href="/(merchant)" />;
  }

  return <Redirect href="/(client)" />;
}
