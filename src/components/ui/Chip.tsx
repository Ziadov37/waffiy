import { Pressable, StyleSheet } from 'react-native';

import { colors, minTouchTarget, radius, spacing } from '@/theme';
import { Text } from './Text';

export type ChipProps = {
  label: string;
  active?: boolean;
  onPress?: () => void;
  /** Teinte or, pour la puce « Récompense disponible ». */
  reward?: boolean;
};

export function Chip({ label, active = false, onPress, reward = false }: ChipProps) {
  const background = active ? (reward ? colors.reward : colors.ink) : colors.white;
  const border = active ? (reward ? colors.reward : colors.ink) : colors.borderInput;
  const foreground = active ? colors.white : colors.textSecondary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: background, borderColor: border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Text variant="label" style={{ color: foreground }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: minTouchTarget - 8,
    justifyContent: 'center',
  },
});
