import { StyleSheet, View } from 'react-native';

import { Avatar, Badge, Card, Icon, Text } from '@/components/ui';
import type { CustomerRow } from '@/features/merchant/api';
import { fullName, initials, lastVisitLabel } from '@/lib/format';
import { colors, spacing } from '@/theme';

export function CustomerCard({
  customer,
  onPress,
}: {
  customer: CustomerRow;
  onPress: () => void;
}) {
  const ready = customer.has_reward_available === true;

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`Fiche de ${fullName(customer.first_name ?? '', customer.last_name ?? '')}`}
      border={ready ? colors.rewardBorder : colors.border}
    >
      <View style={styles.row}>
        <Avatar
          initials={initials(customer.first_name ?? '', customer.last_name ?? '')}
          highlighted={ready}
        />
        <View style={styles.body}>
          <Text variant="bodyMedium" numberOfLines={1}>
            {fullName(customer.first_name ?? '', customer.last_name ?? '')}
          </Text>
          <Text variant="caption" tone="tertiary" numberOfLines={1}>
            {lastVisitLabel(customer.last_activity_at)}
          </Text>
        </View>
        {ready ? (
          <Badge label="Récompense" tone="reward" />
        ) : (
          <Text variant="label" tone="secondary">
            {customer.total_visits ?? 0}
          </Text>
        )}
        <Icon name="chevron-right" size={18} color={colors.textTertiary} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  body: { flex: 1, gap: 2 },
});
