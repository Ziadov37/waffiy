import { StyleSheet, View } from 'react-native';

import { Avatar, Card, Text } from '@/components/ui';
import type { ActivityRow } from '@/features/merchant/api';
import { initials, shortDate, shortName, timeOfDay } from '@/lib/format';
import { colors, spacing } from '@/theme';

/** Une ligne du flux d'activité, avec l'opérateur responsable de l'action. */
export function TransactionItem({
  row,
  detailed = false,
}: {
  row: ActivityRow;
  detailed?: boolean;
}) {
  const isRedeem = row.kind === 'redeem';

  return (
    <Card
      surface={isRedeem ? colors.rewardSurface : colors.surface}
      border={isRedeem ? colors.rewardBorder : colors.border}
    >
      <View style={styles.row}>
        <Avatar
          initials={initials(row.first_name ?? '', row.last_name ?? '')}
          highlighted={isRedeem}
          size={38}
        />
        <View style={styles.body}>
          <Text variant="bodyMedium" numberOfLines={1}>
            {shortName(row.first_name ?? '', row.last_name ?? '')}
          </Text>
          <Text
            variant="caption"
            style={{ color: isRedeem ? colors.rewardText : colors.primary }}
            numberOfLines={1}
          >
            {isRedeem
              ? `🎁 ${row.reward_label ?? 'Récompense utilisée'}`
              : `+${row.delta} point${(row.delta ?? 0) > 1 ? 's' : ''} au solde du commerce`}
          </Text>
          {row.operator_name ? (
            <Text variant="caption" tone="tertiary" numberOfLines={1}>
              Par {row.operator_name}
            </Text>
          ) : null}
        </View>
        <Text variant="caption" tone="tertiary">
          {row.created_at
            ? detailed
              ? `${shortDate(row.created_at)} · ${timeOfDay(row.created_at)}`
              : timeOfDay(row.created_at)
            : ''}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  body: { flex: 1, gap: 2 },
});
