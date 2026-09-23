import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, Screen, Text } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function Welcome() {
  const router = useRouter();

  return (
    <Screen edges={['top', 'bottom']} scroll={false}>
      <View style={styles.content}>
        <View style={styles.logo}>
          <Text variant="display" style={styles.logoLetter}>
            W
          </Text>
        </View>

        <View style={styles.brand}>
          <Text variant="display">La fidélité digitale,{'\n'}dans une seule app.</Text>
          <Text style={styles.pitch}>
            Collectez vos tampons chez vos commerces préférés, ou lancez le programme de
            fidélité de votre commerce.
          </Text>
        </View>

        <View style={styles.actions}>
          <Button
            label="Connexion"
            onPress={() => router.push('/(auth)/login')}
            trailing={<Text style={styles.primaryArrow}>→</Text>}
          />
          <Button
            label="Créer un compte"
            variant="ghost"
            size="md"
            fullWidth={false}
            onPress={() => router.push('/(auth)/role')}
            style={styles.signupButton}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingTop: 40, paddingBottom: 8 },
  brand: { marginTop: 180, gap: 14 },
  logo: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: { color: colors.white, fontSize: 34, lineHeight: 40 },
  pitch: { color: colors.textSecondary, fontSize: 16, lineHeight: 25 },
  actions: { alignItems: 'center', gap: spacing.sm, marginTop: 'auto', paddingTop: 48 },
  signupButton: { alignSelf: 'center' },
  primaryArrow: { color: colors.white, fontSize: 18, lineHeight: 20 },
});
