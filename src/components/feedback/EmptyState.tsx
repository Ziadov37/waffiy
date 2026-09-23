import { StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { colors, spacing } from '@/theme';

export type EmptyStateProps = {
  emoji: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({
  emoji,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.emojiBox}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <View style={styles.copy}>
        <Text variant="heading">{title}</Text>
        <Text tone="secondary">{description}</Text>
      </View>
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          trailing={<Text style={styles.arrow}>→</Text>}
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'flex-start',
    gap: 18,
    paddingTop: 80,
    borderTopWidth: 2,
    borderTopColor: colors.ink,
  },
  emojiBox: {
    width: 74,
    height: 74,
    borderRadius: 24,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderInput,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 32, lineHeight: 40 },
  copy: { gap: spacing.sm },
  action: { marginTop: spacing.sm },
  arrow: { color: colors.white, fontSize: 17, lineHeight: 20 },
});
