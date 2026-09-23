import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Badge, Button, Card, Screen, Text } from '@/components/ui';
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
    card.programs.filter((p) => p.rewardAvailable).map((p) => ({ card, program: p })),
  );

  return (
    <Screen>
      <View style={styles.content}>
        <Text variant="title">Mes récompenses</Text>

        <Text style={styles.section}>Au choix avec vos points</Text>
        <Text tone="secondary">
          Pour un même commerce, tous ces choix utilisent le même solde.
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
                  {program.threshold} points par unité · jusqu’à{' '}
                  {Math.floor(card.points / program.threshold)} avec vos {card.points}{' '}
                  points.
                </Text>
                <Button
                  label="Composer mon choix"
                  variant="reward"
                  style={styles.action}
                  onPress={() => router.push(`/(client)/card/${card.merchantId}`)}
                  trailing={<Text style={styles.whiteArrow}>→</Text>}
                />
              </Card>
            ))}
          </View>
        ) : (
          <Card style={styles.noReward}>
            <Text variant="subheading">Aucune récompense disponible</Text>
            <Text variant="caption" tone="tertiary">
              Continuez à collecter des points chez vos commerces.
            </Text>
          </Card>
        )}

        <Text style={styles.section}>Récompenses utilisées</Text>

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
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 14, gap: 22 },
  section: {
    borderTopWidth: 2,
    borderTopColor: colors.ink,
    paddingTop: 14,
    color: colors.ink,
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.54,
    textTransform: 'uppercase',
  },
  list: { gap: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emoji: { fontSize: 26, lineHeight: 32 },
  headText: { flex: 1, gap: 2 },
  note: { marginTop: spacing.md },
  action: { marginTop: spacing.lg },
  usedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  noReward: { borderStyle: 'dashed', borderRadius: 20, padding: 22, gap: 6 },
  whiteArrow: { color: colors.white, fontSize: 17, lineHeight: 20 },
});
