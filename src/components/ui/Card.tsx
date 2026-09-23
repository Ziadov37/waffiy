import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radius, shadows, spacing } from '@/theme';

export type CardProps = {
  children: ReactNode;
  surface?: string;
  border?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  padded?: boolean;
  raised?: boolean;
  style?: ViewStyle;
};

export function Card({
  children,
  surface = colors.surface,
  border = colors.border,
  onPress,
  accessibilityLabel,
  padded = true,
  raised = false,
  style,
}: CardProps) {
  const base: ViewStyle = {
    backgroundColor: surface,
    borderColor: border,
    ...(padded ? { padding: spacing.lg } : null),
  };

  if (!onPress) {
    return (
      <View style={[styles.card, raised ? shadows.raised : null, base, style]}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        raised ? shadows.raised : null,
        base,
        pressed ? { opacity: 0.94 } : null,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, borderWidth: 1 },
});
