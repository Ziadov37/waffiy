import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/feedback';
import { AppBar, Badge, Button, Card, Screen, Text } from '@/components/ui';
import { useCards, useUsedRewards } from '@/features/cards/hooks';
import { longDate } from '@/lib/format';
import { colors, spacing } from '@/theme';

export default function ClientRewards() {
  const router = useRouter();
  const { data: cards } = useCards();
  const { data: used } = useUsedRewards();

  // Une récompense n'a pas d'état propre : elle est disponible quand le solde
  // atteint le seuil. Rien n'est stocké, tout est dérivé (choix C10).
  const available = (cards ?? []).flatMap((card) =>
    card.programs
      .filter((p) => p.rewardAvailable)
      .map((p) => ({ card, program: p })),
  );

  return (
    <Screen>
      <AppBar title="Mes récompenses" />

      <Text variant="heading" style={styles.section}>
        Disponibles
      </Text>

      {available.length > 0 ? (
        <View style={styles.list}>
          {available.map(({ card, program }) => (
            <Card
              key={program.id}
              surface={colors.rewardSurface}
              border={colors.rewardBorder}
            >
              <View style={styles.head}>
                <Text style={styles.emoji}>{program.emoji}</Text>
                <View style={styles.headText}>
                  <Text variant="subheading">{card.merchantName}</Text>
                  <Text variant="caption" tone="reward">
                    🎁 {program.name}
                  </Text>
                </View>
                <Badge label="Disponible" tone="reward" />
              </View>
              <Text variant="caption" tone="secondary" style={styles.note}>
                Présentez votre QR code au commerçant pour utiliser cette récompense.
              </Text>
              <Button
                label="Afficher mon QR code"
                variant="reward"
                style={styles.action}
                onPress={() => router.push('/(client)/qr')}
              />
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState
          emoji="🎁"
          title="Aucune récompense disponible"
          description="Continuez à collecter des visites chez vos commerces."
        />
      )}

      <Text variant="heading" style={styles.section}>
        Récompenses utilisées
      </Text>

      {used && used.length > 0 ? (
        <View style={styles.list}>
          {used.map((reward) => (
            <Card key={reward.id}>
              <View style={styles.usedRow}>
                <View style={styles.headText}>
                  <Text variant="bodyMedium">{reward.label}</Text>
                  <Text variant="caption" tone="secondary">
                    {reward.merchantName}
                  </Text>
                </View>
                <Text variant="caption" tone="tertiary">
                  {longDate(reward.usedAt)}
                </Text>
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <Card>
          <Text variant="caption" tone="tertiary">
            Vos récompenses utilisées apparaîtront ici.
          </Text>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.xl, marginBottom: spacing.md },
  list: { gap: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emoji: { fontSize: 26, lineHeight: 32 },
  headText: { flex: 1, gap: 2 },
  note: { marginTop: spacing.md },
  action: { marginTop: spacing.lg },
  usedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
