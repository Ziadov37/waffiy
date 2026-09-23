import { StyleSheet, View } from 'react-native';

import { Avatar, Card, Text } from '@/components/ui';
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
  const visits = customer.total_visits ?? 0;
  const ratio = ready ? 1 : Math.min((visits % 10) / 10, 1);
  const accent = ready ? colors.reward : colors.primary;

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`Fiche de ${fullName(customer.first_name ?? '', customer.last_name ?? '')}`}
      border={ready ? colors.rewardBorder : colors.border}
      style={styles.card}
    >
      <View style={styles.row}>
        <Avatar
          initials={initials(customer.first_name ?? '', customer.last_name ?? '')}
          highlighted={ready}
          size={42}
        />
        <View style={styles.body}>
          <View style={styles.topRow}>
            <Text style={styles.name} numberOfLines={1}>
              {fullName(customer.first_name ?? '', customer.last_name ?? '')}
            </Text>
            <Text style={[styles.count, { color: accent }]}>{visits} visites</Text>
          </View>
          <View style={styles.track}>
            <View
              style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: accent }]}
            />
          </View>
          <Text variant="caption" tone="tertiary" numberOfLines={1}>
            {lastVisitLabel(customer.last_activity_at)}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, padding: 15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  body: { flex: 1, gap: 6 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    flex: 1,
    color: colors.ink,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 15,
    lineHeight: 20,
  },
  count: { fontFamily: 'Manrope_800ExtraBold', fontSize: 13, lineHeight: 17 },
  track: { height: 6, borderRadius: 4, backgroundColor: '#EEF1F6', overflow: 'hidden' },
  fill: { height: '100%' },
});
