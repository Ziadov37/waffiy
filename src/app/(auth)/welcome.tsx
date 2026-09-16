import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, Screen, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

export default function Welcome() {
  const router = useRouter();

  return (
    <Screen background={colors.primary} edges={['top', 'bottom']} scroll={false}>
      <View style={styles.content}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Text variant="display" style={styles.logoLetter}>
              W
            </Text>
          </View>
          <Text variant="display" tone="white" center>
            La fidélité digitale,{'\n'}dans une seule app.
          </Text>
          <Text tone="white" center style={styles.pitch}>
            Collectez vos tampons chez vos commerces préférés, ou lancez le programme de
            fidélité de votre commerce.
          </Text>
        </View>

        <View style={styles.actions}>
          <Button
            label="Créer un compte"
            variant="secondary"
            onPress={() => router.push('/(auth)/role')}
          />
          <Button
            label="J’ai déjà un compte"
            variant="ghost"
            onPress={() => router.push('/(auth)/role-login')}
            style={styles.ghost}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'space-between', paddingVertical: spacing.xxxl },
  brand: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.lg },
  logo: {
    width: 84,
    height: 84,
    borderRadius: radius.xxl,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  logoLetter: { color: colors.white, fontSize: 44, lineHeight: 52 },
  pitch: { color: 'rgba(255,255,255,0.86)', paddingHorizontal: spacing.md },
  actions: { gap: spacing.sm },
  // Le bouton fantôme sur fond vert a besoin d'un texte blanc : la variante
  // par défaut vise un fond clair.
  ghost: { borderColor: 'rgba(255,255,255,0.35)', borderWidth: 1 },
});
