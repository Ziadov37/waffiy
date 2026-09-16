import { StyleSheet, View } from 'react-native';

import { Avatar, Card, Text } from '@/components/ui';
import type { ActivityRow } from '@/features/merchant/api';
import { initials, shortName, timeOfDay } from '@/lib/format';
import { colors, spacing } from '@/theme';

/**
 * Une ligne du flux d'activité.
 *
 * Aucune mention de qui a scanné : la gestion d'équipe a été écartée
 * (décision D4). La colonne actor_profile_id existe en base pour l'audit, mais
 * n'est délibérément pas remontée jusqu'ici.
 */
export function TransactionItem({ row }: { row: ActivityRow }) {
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
              : `+${row.delta} visite${(row.delta ?? 0) > 1 ? 's' : ''} — ${row.program_emoji} ${row.program_name}`}
          </Text>
        </View>
        <Text variant="caption" tone="tertiary">
          {row.created_at ? timeOfDay(row.created_at) : ''}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  body: { flex: 1, gap: 2 },
});
