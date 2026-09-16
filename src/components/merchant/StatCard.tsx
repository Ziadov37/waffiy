import { StyleSheet } from 'react-native';

import { Card, Text } from '@/components/ui';

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
      <Text variant="caption" tone="secondary" numberOfLines={1}>
        {label}
      </Text>
      <Text variant="title" style={styles.value}>
        {value}
      </Text>
      {caption ? (
        <Text variant="caption" tone="tertiary" numberOfLines={1}>
          {caption}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 140 },
  value: { marginVertical: 2 },
});
