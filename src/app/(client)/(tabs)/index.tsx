import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/feedback';
import { LoyaltyCard } from '@/components/loyalty';
import { Avatar, Card, Screen, Text } from '@/components/ui';
import { useProfile } from '@/features/auth/hooks';
import { useCards } from '@/features/cards/hooks';
import { initials } from '@/lib/format';
import { colors, fontFamily, spacing } from '@/theme';

export default function ClientHome() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const { data: cards, isPending, error, refetch, isRefetching } = useCards();

  const hasCards = (cards?.length ?? 0) > 0;

  return (
    <Screen onRefresh={() => void refetch()} refreshing={isRefetching}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.greeting}>
            <Text variant="title">
              {profile?.first_name ? `Bonjour ${profile.first_name} 👋` : 'Bonjour 👋'}
            </Text>
            <Text style={styles.subtitle}>Vos commerces, vos points, vos envies.</Text>
          </View>
          {profile ? (
            <Pressable onPress={() => router.push('/(client)/(tabs)/profile')}>
              <Avatar initials={initials(profile.first_name, profile.last_name)} />
            </Pressable>
          ) : null}
        </View>

        {isPending ? (
          <Card>
            <Text tone="secondary">Chargement de vos cartes…</Text>
          </Card>
        ) : error ? (
          <Card>
            <Text tone="danger">Impossible de charger vos points.</Text>
            <Text onPress={() => void refetch()}>Réessayer</Text>
          </Card>
        ) : hasCards ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Mes commerces</Text>
              <Text
                variant="label"
                tone="primary"
                onPress={() => router.push('/(client)/(tabs)/cards')}
              >
                Tout voir
              </Text>
            </View>

            <View style={styles.cards}>
              {cards?.map((card) => (
                <LoyaltyCard
                  key={card.merchantId}
                  card={card}
                  onPress={() => router.push(`/(client)/card/${card.merchantId}`)}
                  onShowQr={() => router.push('/(client)/qr')}
                />
              ))}
            </View>
          </>
        ) : (
          <EmptyState
            emoji="🗂️"
            title="Vous n’avez pas encore de carte."
            description="Scannez le QR code Waffiy d’un commerce pour commencer à collecter."
            actionLabel="Scanner un commerce"
            onAction={() => router.push('/(client)/scan-merchant')}
          />
        )}

        {/* Annoncé dans le prototype, hors périmètre de la phase 1 (question Q11).
          Le bloc est affiché désactivé plutôt que masqué : il fixe une attente
          sans promettre une date. */}
        {hasCards ? (
          <Card style={styles.soon} surface={colors.white} border={colors.borderInput}>
            <Text style={styles.soonLabel}>Bientôt</Text>
            <Text variant="bodyMedium" tone="secondary">
              Découvrir des commerces près de vous
            </Text>
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 14, gap: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  greeting: { flex: 1, gap: 5 },
  subtitle: {
    color: '#6B7280',
    fontFamily: fontFamily.semibold,
    fontSize: 14.5,
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 2,
    borderTopColor: colors.ink,
    paddingTop: 12,
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: fontFamily.bold,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.54,
    textTransform: 'uppercase',
  },
  cards: { gap: spacing.md },
  soon: { borderStyle: 'dashed', borderRadius: 20, padding: 18, gap: 6 },
  soonLabel: {
    color: '#B0B7C3',
    fontFamily: fontFamily.bold,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.54,
    textTransform: 'uppercase',
  },
});
