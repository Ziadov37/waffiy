import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/feedback';
import { LoyaltyCard } from '@/components/loyalty';
import { Card, Screen, Text } from '@/components/ui';
import { useCards } from '@/features/cards/hooks';
import { spacing } from '@/theme';

export default function ClientCards() {
  const router = useRouter();
  const { data: cards, isPending, refetch, isRefetching } = useCards();

  return (
    <Screen onRefresh={() => void refetch()} refreshing={isRefetching}>
      <Text variant="title" style={styles.title}>
        Mes cartes
      </Text>

      {isPending ? (
        <Card>
          <Text tone="secondary">Chargement…</Text>
        </Card>
      ) : cards && cards.length > 0 ? (
        <View style={styles.list}>
          {cards.map((card) => (
            <LoyaltyCard
              key={card.merchantId}
              card={card}
              expanded={false}
              onPress={() => router.push(`/(client)/card/${card.merchantId}`)}
            />
          ))}
        </View>
      ) : (
        <EmptyState
          emoji="🗂️"
          title="Vous n’avez pas encore de carte."
          description="Scannez le QR code Waffiy d’un commerce pour commencer."
          actionLabel="Scanner un commerce"
          onAction={() => router.push('/(client)/scan-merchant')}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { paddingVertical: spacing.lg },
  list: { gap: spacing.md },
});
