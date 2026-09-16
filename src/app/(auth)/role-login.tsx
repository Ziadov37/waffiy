import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppBar, OptionCard, Screen, Text } from '@/components/ui';
import { spacing } from '@/theme';

/**
 * Choix du rôle à la connexion.
 *
 * Purement cosmétique : la connexion est identique dans les deux cas, et c'est
 * la possession d'un commerce qui détermine l'interface affichée (décision D2).
 * L'écran existe parce que le prototype le prévoit et qu'il rassure — mais il
 * ne doit surtout pas laisser croire qu'il existe deux types de comptes.
 */
export default function RoleLogin() {
  const router = useRouter();

  return (
    <Screen>
      <AppBar eyebrow="Connexion" title="Se connecter en tant que" />

      <View style={styles.options}>
        <OptionCard
          emoji="🎟️"
          title="Client"
          description="Mes cartes, mon QR code et mes récompenses."
          onPress={() => router.push({ pathname: '/(auth)/login', params: { role: 'client' } })}
        />
        <OptionCard
          emoji="🏪"
          title="Commerçant"
          description="Scanner, clients, activité et programmes."
          onPress={() =>
            router.push({ pathname: '/(auth)/login', params: { role: 'merchant' } })
          }
        />
      </View>

      <Text variant="caption" tone="tertiary" style={styles.note}>
        Vous retrouverez vos deux rôles quel que soit votre choix ici.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  options: { gap: spacing.md, marginTop: spacing.lg },
  note: { marginTop: spacing.xl },
});
