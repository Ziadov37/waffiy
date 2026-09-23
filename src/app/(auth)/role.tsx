import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppBar, OptionCard, Screen, Text } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function RoleChoice() {
  const router = useRouter();

  return (
    <Screen>
      <AppBar title="" />
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>Inscription — étape 1</Text>
        <Text style={styles.pageTitle}>Vous êtes ?</Text>
      </View>
      <View style={styles.progress}>
        <View style={styles.progressFill} />
      </View>

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
        Un compte client peut créer un commerce plus tard depuis son profil. Le même
        compte peut porter les deux rôles.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: spacing.sm },
  eyebrow: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.54,
    textTransform: 'uppercase',
  },
  pageTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: -0.84,
  },
  progress: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginTop: 22,
  },
  progressFill: {
    width: '33%',
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  options: { gap: spacing.md, marginTop: 22 },
  note: { fontSize: 12.5, lineHeight: 19, marginTop: 22 },
});
