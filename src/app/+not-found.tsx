import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Screen, Text } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function NotFound() {
  return (
    <Screen>
      <View style={styles.wrap}>
        <Text variant="title" center>
          Page introuvable
        </Text>
        <Text tone="secondary" center>
          Cette page n’existe pas ou n’est plus accessible.
        </Text>
        <Link href="/" style={styles.link}>
          <Text variant="button" style={{ color: colors.primary }}>
            Retour à l’accueil
          </Text>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  link: { marginTop: spacing.lg },
});
