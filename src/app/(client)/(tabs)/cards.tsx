import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, TextInput, View } from 'react-native';

import { EmptyState } from '@/components/feedback';
import { LoyaltyCard } from '@/components/loyalty';
import { Card, Screen, Text } from '@/components/ui';
import { useCards } from '@/features/cards/hooks';
import { colors, fontFamily, spacing } from '@/theme';

export default function ClientCards() {
  const router = useRouter();
  const { data: cards, isPending, refetch, isRefetching } = useCards();
  const [search, setSearch] = useState('');
  const uniqueCards = useMemo(
    () =>
      Array.from(new Map((cards ?? []).map((card) => [card.merchantId, card])).values()),
    [cards],
  );
  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('fr');
    if (!needle) return uniqueCards;
    return uniqueCards.filter((card) =>
      card.merchantName.toLocaleLowerCase('fr').includes(needle),
    );
  }, [search, uniqueCards]);

  return (
    <Screen onRefresh={() => void refetch()} refreshing={isRefetching}>
      <View style={styles.content}>
        <View style={styles.heading}>
          <Text variant="title">Mes cartes</Text>
          <Text tone="secondary">
            Une carte par commerce. Touchez une carte pour voir vos points et vos
            récompenses.
          </Text>
        </View>

        <TextInput
          accessibilityLabel="Rechercher une carte"
          placeholder="Rechercher une carte"
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
          style={styles.search}
        />

        {isPending ? (
          <Card>
            <Text tone="secondary">Chargement…</Text>
          </Card>
        ) : filtered.length > 0 ? (
          <View style={styles.list}>
            {filtered.map((card) => (
              <LoyaltyCard
                key={card.merchantId}
                card={card}
                expanded={false}
                onPress={() => router.push(`/(client)/card/${card.merchantId}`)}
              />
            ))}
          </View>
        ) : uniqueCards.length === 0 ? (
          <EmptyState
            emoji="🗂️"
            title="Vous n’avez pas encore de carte."
            description="Scannez le QR code Waffiy d’un commerce pour commencer."
            actionLabel="Scanner un commerce"
            onAction={() => router.push('/(client)/scan-merchant')}
          />
        ) : (
          <EmptyState
            emoji="🔎"
            title="Aucune carte trouvée."
            description="Essayez avec un autre nom de commerce."
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 14, gap: 20 },
  heading: { gap: 6 },
  search: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: 14,
    backgroundColor: colors.white,
    color: colors.ink,
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    lineHeight: 21,
  },
  list: {
    gap: spacing.md,
    borderTopWidth: 2,
    borderTopColor: colors.ink,
    paddingTop: 14,
  },
});
