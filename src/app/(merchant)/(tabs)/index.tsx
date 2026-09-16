import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { OfflineBanner } from '@/components/feedback';
import { StatCard, TransactionItem } from '@/components/merchant';
import { Button, Card, Screen, Text } from '@/components/ui';
import { useMyMerchant, useProfile } from '@/features/auth/hooks';
import { useActivity, useStats } from '@/features/merchant/hooks';
import { usePendingActions } from '@/features/scan/hooks';
import { spacing } from '@/theme';

export default function MerchantHome() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const { data: merchant } = useMyMerchant();
  const { data: stats, refetch, isRefetching } = useStats();
  const { data: activity } = useActivity({ todayOnly: true });
  const { data: pending } = usePendingActions();

  const pendingCount = pending?.length ?? 0;

  return (
    <Screen onRefresh={() => void refetch()} refreshing={isRefetching}>
      <View style={styles.header}>
        <Text variant="title">Bonjour, {profile?.first_name ?? ''} 👋</Text>
        <Text tone="secondary">
          {merchant ? `${merchant.name} — ${merchant.city}` : ''}
        </Text>
      </View>

      <OfflineBanner pendingCount={pendingCount} />

      <View style={styles.stats}>
        <StatCard label="Clients" value={String(stats?.customersCount ?? 0)} />
        <StatCard label="Scans aujourd’hui" value={String(stats?.scansToday ?? 0)} />
        <StatCard
          label="Récompenses utilisées"
          value={String(stats?.rewardsThisMonth ?? 0)}
          caption="ce mois"
        />
        <StatCard
          label="Clients fidèles"
          value={`${stats?.returningRate ?? 0} %`}
          caption="reviennent"
        />
      </View>

      {/* Action principale du commerçant. Le bouton de la barre d'onglets fait
          la même chose ; le doubler ici est délibéré — au comptoir, on ne
          cherche pas, on appuie. */}
      <Card style={styles.scanCard}>
        <Text variant="caption" tone="tertiary">
          Action principale
        </Text>
        <Text variant="heading" style={styles.scanTitle}>
          Scanner un client
        </Text>
        <Text variant="caption" tone="secondary">
          Ajoutez une visite ou validez une récompense en moins de 5 secondes.
        </Text>
        <Button
          label="Scanner maintenant"
          onPress={() => router.push('/(merchant)/scan')}
          style={styles.scanButton}
        />
      </Card>

      <View style={styles.sectionHeader}>
        <Text variant="heading">Activité récente</Text>
        <Text
          variant="label"
          tone="primary"
          onPress={() => router.push('/(merchant)/(tabs)/activity')}
        >
          Tout voir
        </Text>
      </View>

      {activity && activity.length > 0 ? (
        <View style={styles.list}>
          {activity.slice(0, 4).map((row) => (
            <TransactionItem key={row.id} row={row} />
          ))}
        </View>
      ) : (
        <Card>
          <Text variant="caption" tone="tertiary">
            Aucune activité aujourd’hui pour le moment.
          </Text>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingVertical: spacing.lg, gap: 2 },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  scanCard: { marginTop: spacing.xl },
  scanTitle: { marginTop: spacing.xs },
  scanButton: { marginTop: spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  list: { gap: spacing.md },
});
