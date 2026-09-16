import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ProgressDisplay } from '@/components/loyalty';
import { AppBar, Badge, Button, Card, Screen, Text } from '@/components/ui';
import { useCard } from '@/features/cards/hooks';
import { countLabel, lastVisitLabel, remainingLabel } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';

export default function CardDetail() {
  const router = useRouter();
  const { merchantId } = useLocalSearchParams<{ merchantId: string }>();
  const { data: card, isPending } = useCard(merchantId);
  const [selectedId, setSelectedId] = useState<string>();

  if (isPending) {
    return (
      <Screen>
        <AppBar title="Carte de fidélité" />
        <Card>
          <Text tone="secondary">Chargement…</Text>
        </Card>
      </Screen>
    );
  }

  if (!card) {
    return (
      <Screen>
        <AppBar title="Carte de fidélité" />
        <Card>
          <Text tone="secondary">Cette carte n’est plus disponible.</Text>
        </Card>
      </Screen>
    );
  }

  // Le programme affiché : celui choisi, sinon le plus avancé.
  const program = card.programs.find((p) => p.id === selectedId) ?? card.primaryProgram;
  const others = card.programs.filter((p) => p.id !== program?.id);
  const ready = program ? program.stamps >= program.threshold : false;

  return (
    <Screen>
      <AppBar eyebrow={card.city} title={card.merchantName} />

      {program ? (
        <Card
          surface={card.surfaceColor ?? colors.surface}
          border={ready ? colors.rewardBorder : (card.borderColor ?? colors.border)}
        >
          <View style={styles.head}>
            <Text style={styles.emoji}>{program.emoji}</Text>
            <View style={styles.headText}>
              <Text variant="subheading">{program.name}</Text>
              <Text variant="caption" tone="secondary">
                {countLabel(program.threshold, 'visite')} = {program.name}
              </Text>
            </View>
          </View>

          <View style={styles.progress}>
            <ProgressDisplay stamps={program.stamps} threshold={program.threshold} />
          </View>

          <View style={styles.counter}>
            <Text variant="counter" tone={ready ? 'reward' : 'ink'}>
              {program.stamps} / {program.threshold}
            </Text>
            {ready ? (
              <Badge label="Récompense disponible" tone="reward" />
            ) : (
              <Text variant="label" tone="secondary">
                {remainingLabel(program.stamps, program.threshold)}
              </Text>
            )}
          </View>

          {program.description ? (
            <Text variant="caption" tone="secondary" style={styles.description}>
              {program.description}
            </Text>
          ) : null}
        </Card>
      ) : (
        <Card>
          <Text tone="secondary">
            Ce commerce n’a aucun programme actif pour le moment.
          </Text>
        </Card>
      )}

      {others.length > 0 ? (
        <View style={styles.section}>
          <Text variant="label" tone="secondary">
            Autres programmes du commerce
          </Text>
          <View style={styles.others}>
            {others.map((p) => (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityLabel={`${p.name} — ${p.stamps} sur ${p.threshold}`}
                onPress={() => setSelectedId(p.id)}
                style={({ pressed }) => [styles.other, pressed ? { opacity: 0.9 } : null]}
              >
                <Text style={styles.otherEmoji}>{p.emoji}</Text>
                <View style={styles.otherText}>
                  <Text variant="bodyMedium" numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text
                    variant="caption"
                    tone={p.rewardAvailable ? 'reward' : 'tertiary'}
                  >
                    {p.stamps} / {p.threshold}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button
          label={ready ? 'Utiliser ma récompense' : 'Afficher mon QR code'}
          variant={ready ? 'reward' : 'primary'}
          onPress={() => router.push('/(client)/qr')}
        />
        <Text variant="caption" tone="tertiary" center>
          {ready
            ? 'Présentez votre QR code au commerçant pour utiliser cette récompense.'
            : lastVisitLabel(card.lastActivityAt)}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emoji: { fontSize: 32, lineHeight: 38 },
  headText: { flex: 1, gap: 2 },
  progress: { marginTop: spacing.xl },
  counter: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  description: { marginTop: spacing.md },
  section: { marginTop: spacing.xl, gap: spacing.sm },
  others: { gap: spacing.sm },
  other: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  otherEmoji: { fontSize: 22, lineHeight: 28 },
  otherText: { flex: 1, gap: 2 },
  actions: { marginTop: spacing.xxl, gap: spacing.md },
});
