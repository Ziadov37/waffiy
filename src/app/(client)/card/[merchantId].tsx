import { useState } from 'react';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { ActionModal } from '@/components/feedback';
import { AppBar, Button, Card, Icon, Screen, Text } from '@/components/ui';
import { useIsAnonymous, useProfile } from '@/features/auth/hooks';
import { useCard } from '@/features/cards/hooks';
import { maximumQuantity, selectionCost } from '@/features/cards/points';
import { encodeClientQr } from '@/lib/qr';
import { colors, fontFamily } from '@/theme';

export default function CardDetail() {
  const router = useRouter();
  const { merchantId } = useLocalSearchParams<{ merchantId: string }>();
  const { data: card, isPending, error, refetch, isRefetching } = useCard(merchantId);
  const { data: profile } = useProfile();
  const anonymous = useIsAnonymous();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [showQr, setShowQr] = useState(false);
  if (isPending || error || !card)
    return (
      <Screen>
        <AppBar title="Carte de fidélité" />
        <Card>
          <Text>
            {isPending
              ? 'Chargement…'
              : error
                ? 'Impossible de charger votre solde.'
                : 'Cette carte n’est plus disponible.'}
          </Text>
          {error ? <Button label="Réessayer" onPress={() => void refetch()} /> : null}
        </Card>
      </Screen>
    );
  const total = selectionCost(card.programs, quantities);
  const remaining = card.points - total;
  const selected = card.programs.filter((reward) => (quantities[reward.id] ?? 0) > 0);
  const valid = selected.length > 0 && remaining >= 0;

  return (
    <Screen onRefresh={() => void refetch()} refreshing={isRefetching}>
      <AppBar eyebrow="Mes points" title={card.merchantName} />
      <Card
        surface={colors.primaryDark}
        border={colors.primaryDark}
        style={styles.wallet}
      >
        <Text style={styles.walletLabel}>MON SOLDE DISPONIBLE</Text>
        <Text style={styles.balance}>
          {card.points} <Text style={styles.unit}>points</Text>
        </Text>
        <Text style={styles.walletNote}>
          Un seul solde pour toutes vos envies chez {card.merchantName}.
        </Text>
      </Card>
      {anonymous ? (
        <Card
          surface={colors.rewardSurface}
          border={colors.rewardBorder}
          style={styles.secureCard}
        >
          <View style={styles.rewardCopy}>
            <Text variant="subheading">Votre carte est prête</Text>
            <Text variant="caption" tone="secondary">
              Sécurisez-la pour retrouver vos points après un changement de téléphone.
            </Text>
          </View>
          <Button
            label="Sécuriser ma carte"
            variant="secondary"
            onPress={() => router.push('/(client)/secure-account' as Href)}
          />
        </Card>
      ) : null}
      <View style={styles.heading}>
        <Text variant="heading">À vous de choisir</Text>
        <Text tone="secondary">
          Combinez les récompenses ou prenez plusieurs fois la même. Les points sont
          partagés entre tous vos choix.
        </Text>
      </View>
      <View style={styles.list}>
        {card.programs.map((reward) => {
          const quantity = quantities[reward.id] ?? 0;
          const max = maximumQuantity(card.points, reward.threshold);
          return (
            <Card
              key={reward.id}
              border={quantity > 0 ? colors.primary : colors.border}
              style={styles.reward}
            >
              <View style={styles.rewardHead}>
                <View
                  style={[
                    styles.emojiBox,
                    { backgroundColor: reward.surfaceColor ?? colors.surfaceMuted },
                  ]}
                >
                  <Text style={styles.emoji}>{reward.emoji}</Text>
                </View>
                <View style={styles.rewardCopy}>
                  <Text variant="subheading">{reward.name}</Text>
                  <Text variant="bodyMedium" tone="primary">
                    {reward.threshold} points / unité
                  </Text>
                  {reward.description ? (
                    <Text variant="caption" tone="secondary">
                      {reward.description}
                    </Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.rewardBottom}>
                <Text
                  variant="caption"
                  tone={max > 0 ? 'primary' : 'secondary'}
                  style={styles.rewardCopy}
                >
                  {max > 0
                    ? `Jusqu’à ${max} avec votre solde`
                    : `Encore ${reward.threshold - card.points} points`}
                </Text>
                <View style={styles.stepper}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Retirer un ${reward.name}`}
                    disabled={quantity === 0}
                    onPress={() =>
                      setQuantities((q) => ({
                        ...q,
                        [reward.id]: Math.max(0, (q[reward.id] ?? 0) - 1),
                      }))
                    }
                    style={[styles.step, quantity === 0 && styles.disabled]}
                  >
                    <Icon name="minus" />
                  </Pressable>
                  <Text
                    variant="subheading"
                    accessibilityLabel={`Quantité ${reward.name} : ${quantity}`}
                  >
                    {quantity}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Ajouter un ${reward.name}`}
                    disabled={remaining < reward.threshold}
                    onPress={() =>
                      setQuantities((q) =>
                        selectionCost(card.programs, q) + reward.threshold <= card.points
                          ? { ...q, [reward.id]: (q[reward.id] ?? 0) + 1 }
                          : q,
                      )
                    }
                    style={[styles.step, remaining < reward.threshold && styles.disabled]}
                  >
                    <Icon name="plus" />
                  </Pressable>
                </View>
              </View>
            </Card>
          );
        })}
        {card.programs.length === 0 ? (
          <Card>
            <Text tone="secondary">
              Aucune récompense proposée pour le moment. Vos points restent disponibles.
            </Text>
          </Card>
        ) : null}
      </View>
      {selected.length > 0 ? (
        <Card
          surface={colors.primarySurface}
          border={colors.primaryBorder}
          style={styles.selection}
        >
          <Text variant="subheading">Votre choix</Text>
          {selected.map((reward) => (
            <Text key={reward.id}>
              {reward.emoji} {quantities[reward.id]} × {reward.name}
            </Text>
          ))}
          <Text variant="heading">{total} points</Text>
          <Text tone={remaining < 0 ? 'danger' : 'primary'}>
            {remaining < 0
              ? 'Votre solde a changé. Ajustez votre sélection.'
              : `Il vous restera ${remaining} points`}
          </Text>
          <Button
            label="Présenter mon choix au commerçant"
            disabled={!valid || !profile}
            onPress={() => setShowQr(true)}
          />
          <Button
            label="Recommencer mon choix"
            variant="ghost"
            onPress={() => setQuantities({})}
          />
          <Text variant="caption" tone="secondary">
            Les points seront débités uniquement après validation par le commerçant.
          </Text>
        </Card>
      ) : null}
      <ActionModal
        visible={showQr}
        title={card.merchantName}
        cancelLabel="Retour à mon choix"
        onCancel={() => setShowQr(false)}
      >
        {selected.map((reward) => (
          <Text key={reward.id} center>
            {reward.emoji} {quantities[reward.id]} × {reward.name}
          </Text>
        ))}
        <Text variant="heading" center>
          {total} points
        </Text>
        {valid && profile ? (
          <View style={styles.qr}>
            <QRCode value={encodeClientQr(profile.public_code)} size={190} />
          </View>
        ) : (
          <Text tone="danger" center>
            Solde insuffisant : ajustez votre choix.
          </Text>
        )}
        <Text variant="caption" tone="secondary" center>
          Montrez votre sélection. Le commerçant scanne ce QR et valide les récompenses
          choisies.
        </Text>
      </ActionModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wallet: { marginTop: 20, padding: 24, borderRadius: 24, gap: 8 },
  secureCard: { marginTop: 14, gap: 14 },
  walletLabel: {
    color: colors.white,
    fontFamily: fontFamily.bold,
    fontSize: 11,
    letterSpacing: 1.4,
  },
  balance: {
    color: colors.white,
    fontFamily: fontFamily.extrabold,
    fontSize: 48,
    lineHeight: 60,
  },
  unit: { color: colors.white, fontSize: 20 },
  walletNote: { color: colors.white, fontSize: 13, lineHeight: 20 },
  heading: { marginTop: 28, marginBottom: 18, gap: 8 },
  list: { gap: 12 },
  reward: { gap: 16, padding: 18, borderRadius: 20 },
  rewardHead: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  emojiBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 28, lineHeight: 36 },
  rewardCopy: { flex: 1, gap: 4 },
  rewardBottom: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  stepper: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  step: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.3 },
  selection: { marginTop: 20, gap: 12, borderRadius: 20 },
  qr: { alignItems: 'center', padding: 12, backgroundColor: colors.white },
});
