import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/feedback';
import { TransactionItem } from '@/components/merchant';
import { Button, Card, Chip, Screen, Text } from '@/components/ui';
import type { ActivityFilter } from '@/features/merchant/api';
import { useActivity } from '@/features/merchant/hooks';
import { colors, spacing } from '@/theme';

const FILTERS: readonly { value: ActivityFilter; label: string; reward?: boolean }[] = [
  { value: 'all', label: 'Tout' },
  { value: 'credit', label: 'Visites' },
  { value: 'redeem', label: 'Récompenses', reward: true },
];

export default function MerchantActivity() {
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const query = useActivity({ filter, todayOnly: true });

  return (
    <Screen onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
      <View style={styles.content}>
        <Text variant="title">Activité</Text>

        <View style={styles.filters}>
          {FILTERS.map((item) => (
            <Chip
              key={item.value}
              label={item.label}
              active={filter === item.value}
              reward={Boolean(item.reward)}
              onPress={() => setFilter(item.value)}
            />
          ))}
        </View>

        {query.isPending ? (
          <Card style={styles.state}>
            <Text tone="secondary">Chargement de l’activité…</Text>
          </Card>
        ) : query.error ? (
          <Card style={styles.state}>
            <Text variant="heading">Impossible de charger l’activité</Text>
            <Text tone="secondary">Vérifiez votre connexion, puis réessayez.</Text>
            <Button label="Réessayer" onPress={() => void query.refetch()} />
          </Card>
        ) : query.data && query.data.length > 0 ? (
          <View style={styles.list}>
            {query.data.map((row, index) => (
              <TransactionItem key={row.id ?? `${row.created_at}-${index}`} row={row} />
            ))}
          </View>
        ) : (
          <EmptyState
            emoji="🕓"
            title="Aucune activité aujourd’hui"
            description="Les visites créditées et les récompenses utilisées apparaîtront ici."
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 14, gap: 18 },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  state: { gap: spacing.md },
  list: { gap: 10, borderTopWidth: 2, borderTopColor: colors.ink, paddingTop: 14 },
});
