import { Redirect } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppBar, Card, Screen, Text } from '@/components/ui';
import { useSession } from '@/features/auth/hooks';
import { colors, spacing } from '@/theme';

export default function Language() {
  const session = useSession();
  if (!session) return <Redirect href="/(auth)/welcome" />;

  return (
    <Screen>
      <AppBar eyebrow="Préférences" title="Langue" closeIcon />
      <View style={styles.list}>
        <Card
          surface={colors.primarySurface}
          border={colors.primaryBorder}
          style={styles.card}
        >
          <Text variant="subheading">Français</Text>
          <Text variant="caption" tone="primary">
            Langue active
          </Text>
        </Card>
        <Card style={styles.card}>
          <Text variant="subheading" tone="tertiary">
            العربية
          </Text>
          <Text variant="caption" tone="secondary">
            La version arabe sera activée après sa relecture humaine et la validation RTL.
          </Text>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: spacing.lg, gap: spacing.md },
  card: { gap: spacing.xs },
});
