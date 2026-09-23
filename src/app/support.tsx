import * as Linking from 'expo-linking';
import { Redirect } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppBar, Button, Card, Screen, Text } from '@/components/ui';
import { useSession } from '@/features/auth/hooks';
import { env } from '@/lib/env';
import { colors, spacing } from '@/theme';

const SUPPORT_HOURS = 'Dimanche–jeudi, 09:00–18:00 (heure d’Alger)';

export default function Support() {
  const session = useSession();
  if (!session) return <Redirect href="/(auth)/welcome" />;

  const email = env.EXPO_PUBLIC_SUPPORT_EMAIL;
  return (
    <Screen>
      <AppBar eyebrow="Waffiy" title="Aide et support" closeIcon />
      <View style={styles.content}>
        <Card
          surface={colors.primarySurface}
          border={colors.primaryBorder}
          style={styles.card}
        >
          <Text variant="heading">Une personne vous répond</Text>
          <Text tone="secondary">{SUPPORT_HOURS}</Text>
          {email ? (
            <>
              <Text variant="bodyMedium">{email}</Text>
              <Button
                label="Écrire au support"
                onPress={() =>
                  void Linking.openURL(`mailto:${email}?subject=Aide%20Waffiy`)
                }
              />
            </>
          ) : (
            <Text variant="caption" tone="danger">
              Le canal professionnel doit être configuré avant l’ouverture du pilote.
            </Text>
          )}
        </Card>

        <Card style={styles.card}>
          <Text variant="subheading">Pour une réponse rapide</Text>
          <Text tone="secondary">
            Indiquez le nom du commerce, l’écran concerné et l’heure du problème. Ne
            partagez jamais votre mot de passe ni un code de vérification.
          </Text>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { marginTop: spacing.lg, gap: spacing.lg },
  card: { gap: spacing.md },
});
