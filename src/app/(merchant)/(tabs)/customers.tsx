import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, TextInput, View } from 'react-native';

import { EmptyState } from '@/components/feedback';
import { CustomerCard } from '@/components/merchant';
import { Button, Card, Chip, Screen, Text } from '@/components/ui';
import { useCustomers } from '@/features/merchant/hooks';
import type { CustomerFilter } from '@/features/merchant/api';
import { fullName } from '@/lib/format';
import { colors, fontFamily, spacing } from '@/theme';

const FILTERS: readonly { value: CustomerFilter; label: string; reward?: boolean }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'active', label: 'Actifs' },
  { value: 'reward', label: 'Récompense', reward: true },
  { value: 'new', label: 'Nouveaux' },
];

export default function MerchantCustomers() {
  const router = useRouter();
  const [filter, setFilter] = useState<CustomerFilter>('all');
  const [search, setSearch] = useState('');
  const query = useCustomers(filter);

  const customers = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('fr');
    if (!needle) return query.data ?? [];
    return (query.data ?? []).filter((customer) => {
      const name = fullName(customer.first_name ?? '', customer.last_name ?? '');
      return (
        name.toLocaleLowerCase('fr').includes(needle) ||
        (customer.public_code ?? '').toLocaleLowerCase('fr').includes(needle)
      );
    });
  }, [query.data, search]);

  return (
    <Screen onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
      <View style={styles.content}>
        <Text variant="title">Clients</Text>

        <TextInput
          accessibilityLabel="Rechercher un client"
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher un client"
          placeholderTextColor={colors.textTertiary}
          autoCorrect={false}
          style={styles.search}
        />

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
            <Text tone="secondary">Chargement des clients…</Text>
          </Card>
        ) : query.error ? (
          <Card style={styles.state}>
            <Text variant="heading">Impossible de charger les clients</Text>
            <Text tone="secondary">Vérifiez votre connexion, puis réessayez.</Text>
            <Button label="Réessayer" onPress={() => void query.refetch()} />
          </Card>
        ) : customers.length === 0 ? (
          <EmptyState
            emoji={search ? '🔎' : '👥'}
            title={search ? 'Aucun résultat' : 'Aucun client pour le moment'}
            description={
              search
                ? 'Essayez un autre nom ou effacez votre recherche.'
                : 'Votre premier client apparaîtra ici après avoir scanné votre QR d’inscription.'
            }
            {...(search ? { actionLabel: 'Effacer', onAction: () => setSearch('') } : {})}
          />
        ) : (
          <View style={styles.list}>
            {customers.map((customer) =>
              customer.profile_id ? (
                <CustomerCard
                  key={customer.profile_id}
                  customer={customer}
                  onPress={() =>
                    router.push({
                      pathname: '/(merchant)/customer/[clientId]',
                      params: { clientId: customer.profile_id as string },
                    })
                  }
                />
              ) : null,
            )}
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 14, gap: 18 },
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
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  state: { gap: spacing.md },
  list: { gap: 10, borderTopWidth: 2, borderTopColor: colors.ink, paddingTop: 14 },
});
