import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppBar, OptionCard, Screen, Text } from '@/components/ui';
import { spacing } from '@/theme';

export default function RoleChoice() {
  const router = useRouter();

  return (
    <Screen>
      <AppBar eyebrow="Inscription — étape 1" title="Vous êtes ?" />

      <View style={styles.options}>
        <OptionCard
          emoji="🎟️"
          title="Je suis client"
          description="Je collecte des tampons et je récupère mes récompenses."
          onPress={() => router.push('/(auth)/signup-client')}
        />
        <OptionCard
          emoji="🏪"
          title="Je suis commerçant"
          description="Je crée mon programme de fidélité et je scanne mes clients."
          onPress={() => router.push('/(auth)/signup-merchant/commerce')}
        />
      </View>

      {/* Décision D2 : le rôle est une capacité, pas une propriété du compte.
          Le dire ici évite qu'un commerçant crée un second compte pour
          collecter des tampons chez un confrère. */}
      <Text variant="caption" tone="tertiary" style={styles.note}>
        Un compte client peut créer un commerce plus tard depuis son profil. Le même compte
        peut porter les deux rôles.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  options: { gap: spacing.md, marginTop: spacing.lg },
  note: { marginTop: spacing.xl },
});
