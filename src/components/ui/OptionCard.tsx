import { Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';
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
    padding: 20,
    borderRadius: 22,
    borderWidth: 1,
  },
  emojiBox: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 25, lineHeight: 31 },
  body: { flex: 1, gap: 4 },
});
