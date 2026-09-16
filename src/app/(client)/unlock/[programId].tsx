import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Screen, Text } from '@/components/ui';
import { useCards } from '@/features/cards/hooks';
import { colors, radius, spacing } from '@/theme';

/**
 * Récompense débloquée.
 *
 * Insiste sur le fait que RIEN n'est consommé (règle métier 2) : le client
 * possède un droit, qu'il exercera en présentant son QR. Laisser croire à une
 * consommation automatique serait le meilleur moyen de créer un litige au
 * comptoir.
 */
export default function RewardUnlocked() {
  const router = useRouter();
  const { programId } = useLocalSearchParams<{ programId: string }>();
  const { data: cards } = useCards();

  const match = (cards ?? [])
    .flatMap((card) => card.programs.map((program) => ({ card, program })))
    .find((entry) => entry.program.id === programId);

  return (
    <Screen background={colors.rewardSurface} edges={['top', 'bottom']}>
      <View style={styles.body}>
        <Text style={styles.emoji}>🎉</Text>
        <Text variant="title" center>
          Récompense débloquée !
        </Text>
        {match ? (
          <Text tone="secondary" center>
            {match.card.merchantName} — vous avez gagné :
          </Text>
        ) : null}

        <Card surface={colors.white} border={colors.rewardBorder} style={styles.card}>
          <Text variant="caption" tone="tertiary">
            Récompense
          </Text>
          <Text variant="heading" tone="reward" style={styles.rewardName}>
            🎁 {match?.program.name ?? 'Votre récompense'}
          </Text>
          {match?.program.description ? (
            <Text variant="caption" tone="secondary" style={styles.description}>
              {match.program.description}
            </Text>
          ) : null}
          <Text variant="caption" tone="secondary" style={styles.description}>
            Présentez votre QR code au commerçant pour l’utiliser. Rien n’est débité tant
            qu’il ne l’a pas validé.
          </Text>
        </Card>

        <View style={styles.actions}>
          <Button
            label="Afficher mon QR code"
            variant="reward"
            onPress={() => router.replace('/(client)/qr')}
          />
          <Button
            label="Retour à l’accueil"
            variant="ghost"
            onPress={() => router.replace('/(client)')}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  emoji: { fontSize: 56, lineHeight: 66 },
  card: { alignSelf: 'stretch', marginTop: spacing.lg, borderRadius: radius.xl },
  rewardName: { marginTop: spacing.xs },
  description: { marginTop: spacing.md },
  actions: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.xl },
});
