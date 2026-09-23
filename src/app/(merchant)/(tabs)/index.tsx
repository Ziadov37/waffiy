import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { OfflineBanner } from '@/components/feedback';
import { StatCard, TransactionItem } from '@/components/merchant';
import { Button, Card, Screen, Text } from '@/components/ui';
import { useMyMerchant, useProfile } from '@/features/auth/hooks';
import { useActivity, useStats } from '@/features/merchant/hooks';
import { usePendingActions } from '@/features/scan/hooks';
import { useStaffSessionStore } from '@/stores/staff-session';
import { colors, fontFamily, spacing } from '@/theme';

export default function MerchantHome() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const { data: merchant } = useMyMerchant();
  const { data: stats, refetch, isRefetching } = useStats();
  const { data: activity } = useActivity({ todayOnly: true });
  const { data: pending } = usePendingActions();
  const staffSession = useStaffSessionStore((state) => state.session);

  const pendingCount = pending?.length ?? 0;

  return (
    <Screen onRefresh={() => void refetch()} refreshing={isRefetching}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text variant="title">
              Bonjour, {staffSession?.staffName ?? profile?.first_name ?? ''} 👋
            </Text>
            <Text style={styles.subtitle}>
              {merchant ? `${merchant.name} — ${merchant.city}` : ''}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={staffSession ? 'Quitter le mode caisse' : 'Ouvrir les réglages'}
            onPress={() =>
              router.push(
                staffSession
                  ? '/(merchant)/owner-unlock'
                  : '/(merchant)/(tabs)/settings',
              )
            }
            style={styles.merchantLogo}
          >
            <Text style={styles.merchantEmoji}>{staffSession ? '🔒' : '🍔'}</Text>
          </Pressable>
        </View>

        <OfflineBanner pendingCount={pendingCount} />

        {staffSession ? (
          <Card surface="#F2F8F5" border="#CDE8D8" style={styles.cashierBanner}>
            <View style={styles.cashierCopy}>
              <Text variant="label" tone="primary">MODE CAISSE</Text>
              <Text variant="caption" tone="secondary">
                Opérations enregistrées au nom de {staffSession.staffName}
              </Text>
            </View>
            <Text
              variant="label"
              tone="primary"
              onPress={() => router.push('/(merchant)/owner-unlock')}
            >
              Verrouiller
            </Text>
          </Card>
        ) : null}

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
        <Card style={styles.scanCard} surface={colors.ink} border={colors.ink}>
          <Text style={styles.actionEyebrow}>Action principale</Text>
          <Text style={styles.scanTitle}>Scanner un client</Text>
          <Text style={styles.scanDescription}>
            Ajoutez une visite ou validez une récompense en moins de 5 secondes.
          </Text>
          <Button
            label="Scanner maintenant"
            onPress={() => router.push('/(merchant)/scan')}
            style={styles.scanButton}
            trailing={<Text style={styles.scanGlyph}>⌗</Text>}
          />
        </Card>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Activité récente</Text>
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
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 14, gap: 22 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
  },
  headerCopy: { flex: 1, gap: 5 },
  subtitle: {
    color: '#6B7280',
    fontFamily: fontFamily.semibold,
    fontSize: 14.5,
    lineHeight: 20,
  },
  merchantLogo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FDEEE3',
    borderWidth: 1,
    borderColor: '#F6DCC8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  merchantEmoji: { fontSize: 21, lineHeight: 27 },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    borderTopWidth: 2,
    borderTopColor: colors.ink,
    paddingTop: 16,
  },
  scanCard: { borderRadius: 22, padding: 20, gap: 16 },
  actionEyebrow: {
    color: '#8FA0B8',
    fontFamily: fontFamily.bold,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.54,
    textTransform: 'uppercase',
  },
  scanTitle: {
    color: colors.white,
    fontFamily: fontFamily.extrabold,
    fontSize: 21,
    lineHeight: 27,
    letterSpacing: -0.52,
    marginTop: -11,
  },
  scanDescription: {
    color: '#AEBBCC',
    fontFamily: fontFamily.medium,
    fontSize: 13.5,
    lineHeight: 20,
  },
  scanButton: { marginTop: 0 },
  scanGlyph: { color: colors.white, fontSize: 18, lineHeight: 20 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 2,
    borderTopColor: colors.ink,
    paddingTop: 14,
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: fontFamily.bold,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.54,
    textTransform: 'uppercase',
  },
  list: { gap: 10 },
  cashierBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cashierCopy: { flex: 1, gap: 3 },
});
