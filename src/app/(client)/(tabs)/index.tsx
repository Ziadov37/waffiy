import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/feedback';
import { LoyaltyCard } from '@/components/loyalty';
import { Avatar, Card, Screen, Text } from '@/components/ui';
import { useProfile } from '@/features/auth/hooks';
import { useCards } from '@/features/cards/hooks';
import { initials } from '@/lib/format';
import { colors, spacing } from '@/theme';

export default function ClientHome() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const { data: cards, isPending, refetch, isRefetching } = useCards();

  const hasCards = (cards?.length ?? 0) > 0;

  return (
    <Screen onRefresh={() => void refetch()} refreshing={isRefetching}>
      <View style={styles.header}>
        <View style={styles.greeting}>
          <Text variant="title">Bonjour {profile?.first_name ?? ''} 👋</Text>
          <Text tone="secondary">Continuez à gagner des récompenses.</Text>
        </View>
        {profile ? (
          <Avatar initials={initials(profile.first_name, profile.last_name)} />
        ) : null}
      </View>

      {isPending ? (
        <Card>
          <Text tone="secondary">Chargement de vos cartes…</Text>
        </Card>
      ) : hasCards ? (
        <>
          <View style={styles.sectionHeader}>
            <Text variant="heading">Mes cartes</Text>
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
        <Card style={styles.soon} surface={colors.surfaceMuted} border={colors.border}>
          <Text variant="caption" tone="tertiary">
            Bientôt
          </Text>
          <Text variant="bodyMedium" tone="secondary">
            Découvrir des commerces près de vous
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  greeting: { flex: 1, gap: 2 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  cards: { gap: spacing.md },
  soon: { marginTop: spacing.xl },
});
