import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/feedback';
import { ProgressDisplay } from '@/components/loyalty';
import { AppBar, Badge, Button, Card, Icon, Screen, Text } from '@/components/ui';
import { usePrograms } from '@/features/merchant/hooks';
import { countLabel } from '@/lib/format';
import { colors, shadows, spacing } from '@/theme';

export default function ProgramsList() {
  const router = useRouter();
  const query = usePrograms();
  const insets = useSafeAreaInsets();

  return (
    <Screen
      onRefresh={() => void query.refetch()}
      refreshing={query.isRefetching}
      footer={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Créer un programme"
          onPress={() => router.push('/(merchant)/programs/new')}
          style={({ pressed }) => [
            styles.create,
            shadows.raised,
            { bottom: Math.max(insets.bottom, spacing.xl) },
            pressed && styles.createPressed,
          ]}
        >
          <Icon name="plus" size={36} color={colors.white} strokeWidth={2.5} />
        </Pressable>
      }
    >
      <AppBar eyebrow="Réglages" title="Programmes de fidélité" />
      <Text tone="secondary" style={styles.description}>
        Les points sont communs à toutes les récompenses du commerce. Définissez ici
        le coût de chaque récompense ; le client choisit comment utiliser son solde.
      </Text>

      {query.isPending ? (
        <Card style={styles.state}>
          <Text tone="secondary">Chargement des programmes…</Text>
        </Card>
      ) : query.error ? (
        <Card style={styles.state}>
          <Text variant="heading">Impossible de charger les programmes</Text>
          <Button label="Réessayer" onPress={() => void query.refetch()} />
        </Card>
      ) : query.data && query.data.length > 0 ? (
        <View style={styles.list}>
          {query.data.map((program) => (
            <Card
              key={program.id}
              onPress={() =>
                router.push({
                  pathname: '/(merchant)/programs/[id]',
                  params: { id: program.id },
                })
              }
              accessibilityLabel={`Modifier le programme ${program.name}`}
              surface={colors.white}
              border={program.border_color ?? colors.border}
              style={styles.programCard}
            >
              <View style={styles.programHead}>
                <View
                  style={[
                    styles.emojiBox,
                    {
                      backgroundColor: program.surface_color ?? colors.background,
                      borderColor: program.border_color ?? colors.border,
                    },
                  ]}
                >
                  <Text style={styles.emoji}>{program.emoji}</Text>
                </View>
                <View style={styles.programName}>
                  <Text variant="subheading" numberOfLines={1}>
                    {program.name}
                  </Text>
                  <Text variant="caption" tone="secondary" numberOfLines={1}>
                    {countLabel(program.threshold, 'point')}
                    {program.description ? ` — ${program.description}` : ''}
                  </Text>
                </View>
                <Badge
                  label={program.status === 'active' ? 'Actif' : 'Brouillon'}
                  tone={program.status === 'active' ? 'success' : 'neutral'}
                />
              </View>
              <View style={styles.preview}>
                <ProgressDisplay
                  stamps={Math.max(program.threshold - 2, 0)}
                  threshold={program.threshold}
                  compact
                />
              </View>
              <View style={styles.programFoot}>
                <Text variant="caption" tone="tertiary">
                  {countLabel(program.memberCount, 'client')}
                </Text>
                <View style={styles.edit}>
                  <Text variant="label" tone="primary">
                    Modifier →
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState
          emoji="🎁"
          title="Aucun programme"
          description="Créez une première récompense pour commencer à créditer des visites."
        />
      )}

    </Screen>
  );
}

const styles = StyleSheet.create({
  description: { marginTop: spacing.sm, fontSize: 14, lineHeight: 22 },
  state: { marginTop: spacing.xl, gap: spacing.md },
  list: {
    borderTopWidth: 2,
    borderTopColor: colors.ink,
    paddingTop: spacing.md,
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  programHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  programCard: { borderRadius: 20, padding: 18, gap: 14 },
  emojiBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 21, lineHeight: 27 },
  programName: { flex: 1, gap: 2 },
  preview: { borderTopWidth: 1, borderTopColor: '#EEF1F6', paddingTop: 13 },
  programFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  edit: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  create: {
    position: 'absolute',
    right: 22,
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createPressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
});
