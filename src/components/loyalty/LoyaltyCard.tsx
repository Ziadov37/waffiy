import { StyleSheet, View } from 'react-native';

import { Badge, Card, Icon, Text } from '@/components/ui';
import type { Card as CardModel } from '@/features/cards/api';
import { lastVisitLabel, remainingLabel } from '@/lib/format';
import { colors, spacing } from '@/theme';
import { ProgressDisplay } from './ProgressDisplay';

export type LoyaltyCardProps = {
  card: CardModel;
  onPress?: () => void;
  onShowQr?: () => void;
  /** Version détaillée : pastilles, ligne de récompense, dernière visite. */
  expanded?: boolean;
};

export function LoyaltyCard({ card, onPress, expanded = true }: LoyaltyCardProps) {
  const program = card.primaryProgram;
  const ready = card.rewardAvailable;

  return (
    <Card
      surface={card.surfaceColor ?? colors.surface}
      border={ready ? colors.rewardBorder : (card.borderColor ?? colors.border)}
      {...(onPress ? { onPress, accessibilityLabel: `Carte ${card.merchantName}` } : {})}
    >
      <View style={styles.header}>
        <Text style={styles.emoji}>{program?.emoji ?? '🎁'}</Text>
        <View style={styles.headerText}>
          <Text variant="subheading" numberOfLines={1}>
            {card.merchantName}
          </Text>
          {program ? (
            <Text variant="caption" tone="secondary" numberOfLines={1}>
              🎁 {program.name}
              {card.programs.length > 1
                ? `  ·  ${card.programs.length} programmes`
                : ''}
            </Text>
          ) : (
            <Text variant="caption" tone="tertiary">
              Aucun programme actif pour le moment
            </Text>
          )}
        </View>
        {onPress ? <Icon name="chevron-right" size={20} color={colors.textTertiary} /> : null}
      </View>

      {program ? (
        <>
          {expanded ? (
            <View style={styles.progress}>
              <ProgressDisplay stamps={program.stamps} threshold={program.threshold} />
            </View>
          ) : null}

          <View style={styles.footer}>
            <Text variant="counter" tone={ready ? 'reward' : 'ink'}>
              {program.stamps} / {program.threshold}
            </Text>
            {ready ? (
              <Badge label="Récompense disponible" tone="reward" />
            ) : (
              <Text variant="label" tone="secondary">
                {remainingLabel(program.stamps, program.threshold)}
              </Text>
            )}
          </View>

          {expanded ? (
            <Text variant="caption" tone="tertiary" style={styles.lastVisit}>
              {lastVisitLabel(card.lastActivityAt)}
            </Text>
          ) : null}
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emoji: { fontSize: 28, lineHeight: 34 },
  headerText: { flex: 1, gap: 2 },
  progress: { marginTop: spacing.lg },
  footer: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  lastVisit: { marginTop: spacing.sm },
});
