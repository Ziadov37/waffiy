import { useEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Button, Card, Screen, Text } from '@/components/ui';
import { useAnonymousSignIn } from '@/features/auth/hooks';
import { usePublicMerchant, useJoinMerchant } from '@/features/cards/hooks';
import { toAppError } from '@/lib/errors';
import { parseScannedCode } from '@/lib/qr';
import { useSessionStore } from '@/stores/session';
import { colors, radius, spacing } from '@/theme';

const categoryLabels = {
  restaurant: 'Restaurant',
  cafe: 'Café',
  fast_food: 'Snack et restauration rapide',
  bakery: 'Boulangerie et pâtisserie',
  beauty: 'Beauté',
  retail: 'Commerce',
  other: 'Commerce local',
} as const;

const JOIN_STEP_TIMEOUT_MS = 15_000;

async function withTimeout<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error('NETWORK_TIMEOUT')), JOIN_STEP_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Point d'arrivée du lien profond `waffiy://join?code=…`. */
export default function JoinMerchantLink() {
  const router = useRouter();
  const { width: viewportWidth } = useWindowDimensions();
  const pageWidth = Math.max(280, Math.min(viewportWidth - 44, 480));
  const centeredWidth = Math.max(280, Math.min(viewportWidth - 44, 430));
  const params = useLocalSearchParams<{ code?: string | string[] }>();
  const rawCode = Array.isArray(params.code) ? params.code[0] : params.code;
  const parsed = useMemo(() => parseScannedCode(rawCode ?? ''), [rawCode]);
  const joinCode = parsed?.kind === 'merchant' ? parsed.code : undefined;
  const session = useSessionStore((state) => state.session);
  const setActiveRole = useSessionStore((state) => state.setActiveRole);
  const setPendingJoinCode = useSessionStore((state) => state.setPendingJoinCode);
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const merchant = usePublicMerchant(joinCode);
  const join = useJoinMerchant();
  const anonymousSignIn = useAnonymousSignIn();

  useEffect(() => {
    if (joinCode) setPendingJoinCode(joinCode);
  }, [joinCode, setPendingJoinCode]);

  const addCard = async () => {
    if (!joinCode || submitting) return;
    setError(undefined);
    setSubmitting(true);
    try {
      if (!session) await withTimeout(anonymousSignIn.mutateAsync());
      const result = await withTimeout(join.mutateAsync(joinCode));
      setPendingJoinCode(null);
      setActiveRole('client');
      router.replace(`/(client)/card/${result.merchant_id}`);
    } catch (cause) {
      setError(toAppError(cause).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!joinCode) {
    return (
      <Screen padded={false} contentStyle={styles.screen}>
        <View style={[styles.centered, { width: centeredWidth }]}>
          <View style={styles.brandMark}>
            <Text variant="heading" tone="white">
              W
            </Text>
          </View>
          <Text variant="title" center>
            Carte introuvable
          </Text>
          <Text tone="secondary" center>
            Ce lien Waffiy est incomplet ou invalide.
          </Text>
        </View>
      </Screen>
    );
  }

  if (merchant.isPending) {
    return (
      <Screen padded={false} contentStyle={styles.screen}>
        <View style={[styles.centered, { width: centeredWidth }]}>
          <View style={styles.brandMark}>
            <Text variant="heading" tone="white">
              W
            </Text>
          </View>
          <Text tone="secondary">Chargement de la carte…</Text>
        </View>
      </Screen>
    );
  }

  if (merchant.isError || !merchant.data) {
    return (
      <Screen padded={false} contentStyle={styles.screen}>
        <View style={[styles.centered, { width: centeredWidth }]}>
          <View style={styles.brandMark}>
            <Text variant="heading" tone="white">
              W
            </Text>
          </View>
          <Text variant="title" center>
            Commerce indisponible
          </Text>
          <Text tone="secondary" center>
            Cette carte n’est plus disponible ou le réseau ne répond pas.
          </Text>
          <Button label="Réessayer" onPress={() => void merchant.refetch()} />
        </View>
      </Screen>
    );
  }

  const preview = merchant.data;
  const initial = preview.merchantName.trim().slice(0, 1).toUpperCase() || 'W';

  return (
    <Screen padded={false} contentStyle={styles.screen}>
      <View style={[styles.page, { width: pageWidth }]}>
        <View style={styles.brand}>
          <View style={styles.brandMark}>
            <Text variant="heading" tone="white">
              W
            </Text>
          </View>
          <Text variant="heading">Waffiy</Text>
        </View>

        <Card raised style={styles.card}>
          <View style={styles.identity}>
            {preview.logoUrl ? (
              <Image
                source={{ uri: preview.logoUrl }}
                style={styles.logo}
                contentFit="cover"
                accessibilityLabel={`Logo ${preview.merchantName}`}
              />
            ) : (
              <View style={[styles.logo, styles.logoFallback]}>
                <Text variant="title" tone="primary">
                  {initial}
                </Text>
              </View>
            )}
            <View style={styles.identityCopy}>
              <Text variant="title">{preview.merchantName}</Text>
              <Text tone="secondary">
                {categoryLabels[preview.category]} · {preview.city}
              </Text>
            </View>
          </View>

          {preview.rewardName ? (
            <View style={styles.reward}>
              <Text variant="label" tone="primary" style={styles.rewardLabel}>
                Votre prochaine récompense
              </Text>
              <Text variant="heading">
                {preview.rewardEmoji ?? '🎁'} {preview.rewardName}
              </Text>
              {preview.rewardThreshold ? (
                <Text tone="secondary">
                  Après {preview.rewardThreshold} passages admissibles.
                </Text>
              ) : null}
              {preview.rewardDescription ? (
                <Text tone="secondary">{preview.rewardDescription}</Text>
              ) : null}
            </View>
          ) : null}

          <View style={styles.actions}>
            <Button
              label={session ? 'Ajouter ma carte' : 'Ajouter ma carte maintenant'}
              loadingLabel="Ajout de la carte…"
              loading={submitting}
              onPress={() => void addCard()}
            />
            {!session ? (
              <>
                <Text variant="caption" tone="secondary" center>
                  Aucun nom, email ou téléphone demandé. Vous pourrez sécuriser la carte
                  ensuite.
                </Text>
                <Button
                  label="J’ai déjà un compte"
                  variant="secondary"
                  onPress={() => router.push('/(auth)/login')}
                />
              </>
            ) : null}
            {error ? (
              <Text variant="caption" tone="danger" center>
                {error}
              </Text>
            ) : null}
          </View>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  page: {
    gap: spacing.xxl,
    maxWidth: 480,
  },
  centered: {
    alignItems: 'center',
    gap: spacing.lg,
    maxWidth: 430,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  brandMark: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  card: { padding: spacing.xxl, gap: spacing.xl },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  identityCopy: { flex: 1, gap: spacing.xs },
  logo: {
    width: 68,
    height: 68,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySurface,
  },
  reward: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySurface,
  },
  rewardLabel: { textTransform: 'uppercase', letterSpacing: 0.8 },
  actions: { gap: spacing.md },
});
