import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';
import { Text } from './Text';

type Tone = 'neutral' | 'success' | 'reward';

const TONES: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: colors.surfaceMuted, fg: colors.textMuted },
  success: { bg: colors.primarySurface, fg: colors.primaryDark },
  reward: { bg: colors.rewardSurface, fg: colors.rewardText },
};

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const { bg, fg } = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text variant="caption" style={{ color: fg }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
});
