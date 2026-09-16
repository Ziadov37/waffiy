import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, shadows, spacing } from '@/theme';
import { Icon } from './Icon';
import { Text } from './Text';

export type OptionCardProps = {
  emoji: string;
  title: string;
  description: string;
  onPress: () => void;
  selected?: boolean;
};

/** Grande carte de choix — sélection du rôle, catégorie de commerce. */
export function OptionCard({
  emoji,
  title,
  description,
  onPress,
  selected = false,
}: OptionCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        shadows.card,
        {
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? colors.primarySurface : colors.white,
          opacity: pressed ? 0.94 : 1,
        },
      ]}
    >
      <View style={styles.emojiBox}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <View style={styles.body}>
        <Text variant="subheading">{title}</Text>
        <Text variant="caption" tone="secondary">
          {description}
        </Text>
      </View>
      <Icon name="chevron-right" color={colors.textTertiary} size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  emojiBox: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 24, lineHeight: 30 },
  body: { flex: 1, gap: 2 },
});
