import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/feedback';
import { ScanClientHeader, TransactionItem } from '@/components/merchant';
import { AppBar, Button, Card, Screen, Text } from '@/components/ui';
import { useCustomerDetail } from '@/features/merchant/hooks';
import { lastVisitLabel } from '@/lib/format';
import { colors, spacing } from '@/theme';

export default function CustomerDetail() {
  const params = useLocalSearchParams<{ clientId?: string | string[] }>();
  const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;
  const query = useCustomerDetail(clientId);

  if (query.isPending) {
    return (
      <Screen>
        <AppBar title="Fiche client" />
        <Card>
          <Text tone="secondary">Chargement du client…</Text>
        </Card>
      </Screen>
    );
  }

  if (query.error) {
    return (
      <Screen>
        <AppBar title="Fiche client" />
        <Card style={styles.state}>
          <Text variant="heading">Impossible de charger cette fiche</Text>
          <Text tone="secondary">Vérifiez votre connexion, puis réessayez.</Text>
          <Button label="Réessayer" onPress={() => void query.refetch()} />
        </Card>
      </Screen>
    );
  }

  const customer = query.data?.customer;
  if (!customer) {
    return (
      <Screen>
        <AppBar title="Fiche client" />
        <EmptyState
          emoji="👤"
          title="Client introuvable"
          description="Cette personne ne fait plus partie des clients de ce commerce."
        />
      </Screen>
    );
  }

  return (
    <Screen
      onRefresh={() => void query.refetch()}
      refreshing={query.isRefetching}
      contentStyle={styles.content}
    >
      <AppBar eyebrow="Fiche client" title="" />

      <View style={styles.header}>
        <ScanClientHeader
          firstName={customer.first_name ?? ''}
          lastName={customer.last_name ?? ''}
          joinedAt={customer.joined_at}
          highlighted={customer.has_reward_available === true}
        />
      </View>

      {query.data.progress[0]?.programs ? (
        <Card style={styles.progressCard}>
          <View style={styles.progressTop}>
            <Text style={styles.progressValue}>
              {query.data.progress[0].stamps} points
            </Text>
            <Text style={styles.rewardName}>
              🎁 {query.data.progress[0].programs.name}
            </Text>
          </View>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {
                  width: `${Math.min(query.data.progress[0].stamps / query.data.progress[0].programs.threshold, 1) * 100}%`,
                  backgroundColor:
                    query.data.progress[0].stamps >=
                    query.data.progress[0].programs.threshold
                      ? colors.reward
                      : colors.primary,
                },
              ]}
            />
          </View>
        </Card>
      ) : null}

      <View style={styles.stats}>
        <MiniStat label="Visites" value={String(customer.total_visits ?? 0)} />
        <MiniStat label="Récomp." value={String(customer.rewards_redeemed ?? 0)} />
        <MiniStat
          label="Dernière"
          value={lastVisitLabel(customer.last_activity_at)}
          small
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Historique</Text>
        {query.data.history.length > 0 ? (
          <View style={styles.list}>
            {query.data.history.map((row, index) => (
              <TransactionItem
                key={row.id ?? `${row.created_at}-${index}`}
                row={row}
                detailed
              />
            ))}
          </View>
        ) : (
          <Card>
            <Text tone="secondary">Aucune opération pour ce client.</Text>
          </Card>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 20 },
  state: { marginTop: spacing.xl, gap: spacing.md },
  header: {},
  progressCard: { borderRadius: 20, padding: 18, gap: 14 },
  progressTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 10,
  },
  progressValue: {
    color: colors.ink,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -1.05,
  },
  rewardName: {
    color: colors.ink,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
    lineHeight: 19,
    textAlign: 'right',
  },
  track: { height: 8, backgroundColor: '#EEF1F6', borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%' },
  stats: {
    flexDirection: 'row',
    gap: 10,
  },
  miniStat: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    gap: 4,
  },
  miniLabel: {
    color: colors.textMuted,
    fontFamily: 'Manrope_700Bold',
    fontSize: 10.5,
    lineHeight: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.84,
  },
  miniValue: {
    color: colors.ink,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 20,
    lineHeight: 25,
  },
  miniSmall: { fontSize: 12.5, lineHeight: 17 },
  section: { gap: spacing.md },
  sectionTitle: {
    borderTopWidth: 2,
    borderTopColor: colors.ink,
    paddingTop: 14,
    color: colors.ink,
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.54,
    textTransform: 'uppercase',
  },
  list: { gap: spacing.sm },
});

function MiniStat({
  label,
  value,
  small = false,
}: {
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={[styles.miniValue, small ? styles.miniSmall : null]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}
