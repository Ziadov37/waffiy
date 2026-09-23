import { Image, StyleSheet, View } from 'react-native';
import { Card, Icon, Text } from '@/components/ui';
import type { Card as CardModel } from '@/features/cards/api';
import { colors, fontFamily, spacing } from '@/theme';

export type LoyaltyCardProps = {
  card: CardModel;
  onPress?: () => void;
  onShowQr?: () => void;
  expanded?: boolean;
};

export function LoyaltyCard({ card, onPress, expanded = true }: LoyaltyCardProps) {
  const merchantHeader = (
    <View style={styles.head}>
      <View
        style={[
          styles.logo,
          { backgroundColor: card.surfaceColor ?? colors.primarySurface },
        ]}
      >
        {card.logoUrl ? (
          <Image source={{ uri: card.logoUrl }} style={styles.logoImage} />
        ) : (
          <Text style={styles.emoji}>{card.primaryProgram?.emoji ?? '🏪'}</Text>
        )}
      </View>
      <View style={styles.name}>
        <Text variant="subheading">{card.merchantName}</Text>
        <Text variant="caption" tone="secondary">
          {card.city}
        </Text>
      </View>
      <Icon name="chevron-right" color={colors.textMuted} />
    </View>
  );

  if (!expanded) {
    return (
      <Card
        {...(onPress ? { onPress } : {})}
        accessibilityLabel={`Carte ${card.merchantName}. Voir le détail`}
        surface={colors.white}
        border={card.borderColor ?? colors.border}
        style={styles.compactCard}
      >
        {merchantHeader}
      </Card>
    );
  }

  return (
    <Card
      {...(onPress ? { onPress } : {})}
      accessibilityLabel={`${card.merchantName}, ${card.points} points. Voir les récompenses`}
      surface={colors.white}
      border={card.borderColor ?? colors.border}
      style={styles.card}
    >
      {merchantHeader}
      <View style={styles.balance}>
        <Text style={styles.points}>{card.points}</Text>
        <Text style={styles.unit}>POINTS</Text>
        <Text variant="caption" tone="secondary" style={styles.balanceNote}>
          à utiliser chez ce commerce
        </Text>
      </View>
      <View style={styles.rewards}>
        {card.programs.map((reward) => (
          <View
            key={reward.id}
            style={[styles.reward, !reward.rewardAvailable && styles.locked]}
          >
            <Text style={styles.emoji}>{reward.emoji}</Text>
            {expanded ? (
              <Text variant="caption" numberOfLines={1}>
                {reward.name}
              </Text>
            ) : null}
            <Text variant="label" tone={reward.rewardAvailable ? 'primary' : 'secondary'}>
              {reward.threshold} pts
            </Text>
            {reward.rewardAvailable ? (
              <Text variant="caption" tone="primary">
                Disponible
              </Text>
            ) : null}
          </View>
        ))}
        {card.programs.length === 0 ? (
          <Text variant="caption" tone="secondary">
            De nouvelles récompenses bientôt.
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 20, borderRadius: 24, gap: 18 },
  compactCard: { padding: 16, borderRadius: 18 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: { width: 48, height: 48 },
  emoji: { fontSize: 26, lineHeight: 34 },
  name: { flex: 1, gap: 2 },
  balance: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    columnGap: 8,
  },
  points: {
    fontFamily: fontFamily.extrabold,
    fontSize: 40,
    lineHeight: 48,
    color: colors.primaryDark,
  },
  unit: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.primaryDark,
    letterSpacing: 1,
  },
  balanceNote: { flexBasis: '100%' },
  rewards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
  },
  reward: {
    backgroundColor: colors.primarySurface,
    borderRadius: 14,
    padding: 10,
    minWidth: 80,
    maxWidth: 150,
    alignItems: 'center',
    gap: 3,
  },
  locked: { backgroundColor: colors.surfaceMuted },
});
