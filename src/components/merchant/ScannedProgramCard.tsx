import { StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import type { ScannedProgram } from '@/features/scan/api';
import { colors, spacing } from '@/theme';

type ScannedProgramCardProps = {
  program: ScannedProgram;
  selected: boolean;
  onPress: () => void;
};

export function ScannedProgramCard({
  program,
  selected,
  onPress,
}: ScannedProgramCardProps) {
  const reward = program.rewardAvailable;
  const accent = reward ? colors.reward : colors.primary;
  const ratio = Math.min(program.stamps / program.threshold, 1);

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${program.name}, ${program.threshold} points, jusqu’à ${Math.floor(program.stamps / program.threshold)} récompenses`}
      border={
        selected
          ? reward
            ? colors.reward
            : colors.primary
          : reward
            ? colors.rewardBorder
            : colors.border
      }
      surface={
        selected ? (reward ? colors.rewardSurface : colors.primarySurface) : colors.white
      }
      style={styles.card}
    >
      <View style={styles.header}>
        <Text style={styles.emoji}>{program.emoji}</Text>
        <View style={styles.name}>
          <View style={styles.topRow}>
            <Text style={styles.title} numberOfLines={1}>
              {program.name}
            </Text>
            <Text style={[styles.count, { color: accent }]}>{program.threshold} pts</Text>
          </View>
          <View style={styles.track}>
            <View
              style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: accent }]}
            />
          </View>
          <Text style={[styles.remaining, { color: accent }]}>
            {reward
              ? `Jusqu’à ${Math.floor(program.stamps / program.threshold)} avec le solde commun`
              : `Encore ${program.threshold - program.stamps} points`}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 2, borderRadius: 16, paddingHorizontal: 15, paddingVertical: 13 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emoji: { fontSize: 20, lineHeight: 25 },
  name: { flex: 1, gap: 6 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    color: colors.ink,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14.5,
    lineHeight: 19,
  },
  count: { fontFamily: 'Manrope_800ExtraBold', fontSize: 13, lineHeight: 17 },
  track: { height: 6, borderRadius: 4, backgroundColor: '#EEF1F6', overflow: 'hidden' },
  fill: { height: '100%' },
  remaining: { fontFamily: 'Manrope_700Bold', fontSize: 12, lineHeight: 16 },
});
