import { StyleSheet } from 'react-native';

import { Card, Text } from '@/components/ui';
import { colors } from '@/theme';

export function StatCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption?: string;
}) {
  return (
    <Card style={styles.card}>
      <Text variant="caption" numberOfLines={1} style={styles.label}>
        {label}
      </Text>
      <Text variant="title" style={styles.value}>
        {value}
      </Text>
      {caption ? (
        <Text variant="caption" numberOfLines={1} style={styles.caption}>
          {caption}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { width: '48%', flexGrow: 1, flexBasis: '46%', padding: 16, borderRadius: 18 },
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  value: { marginVertical: 2, fontSize: 27, lineHeight: 33 },
  caption: {
    color: colors.primary,
    fontSize: 12.5,
    lineHeight: 17,
    fontFamily: 'Manrope_700Bold',
  },
});
