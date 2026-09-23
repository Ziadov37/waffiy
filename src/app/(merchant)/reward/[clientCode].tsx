import { useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ActionModal, OfflineBanner } from '@/components/feedback';
import { AppBar, Button, Card, Screen, Text } from '@/components/ui';
import { useMyMerchant } from '@/features/auth/hooks';
import {
  usePendingActions,
  useRedeemReward,
  useResolveClient,
  type ScanMutationInput,
  type ScanMutationResult,
} from '@/features/scan/hooks';
import { toAppError, type AppError } from '@/lib/errors';
import { fullName } from '@/lib/format';
import { newRequestId } from '@/lib/offline/queue';
import { colors, spacing } from '@/theme';

type ModalState = 'confirm' | 'success' | 'queued' | 'error' | null;

export default function MerchantReward() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    clientCode?: string | string[];
    programId?: string | string[];
  }>();
  const clientCode = firstParam(params.clientCode);
  const programId = firstParam(params.programId);
  const { data: merchant } = useMyMerchant();
  const query = useResolveClient(merchant?.id, clientCode);
  const redeem = useRedeemReward();
  const { data: pending } = usePendingActions();

  const [modal, setModal] = useState<ModalState>(null);
  const [quantity, setQuantity] = useState(1);
  const [actionError, setActionError] = useState<AppError | null>(null);
  const [lastResult, setLastResult] = useState<ScanMutationResult | null>(null);
  const actionRef = useRef<ScanMutationInput | null>(null);

  if (query.isPending || !merchant) {
    return (
      <Screen background={colors.rewardSurface}>
        <AppBar title="Récompense" closeIcon />
        <View style={styles.loading}>
          <ActivityIndicator color={colors.reward} />
          <Text tone="secondary">Vérification de la récompense…</Text>
        </View>
      </Screen>
    );
  }

  if (query.error || !query.data || !clientCode) {
    const error = toAppError(query.error);
    return (
      <Screen>
        <AppBar title="Récompense indisponible" closeIcon />
        <Card style={styles.errorCard}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text variant="heading">{error.title}</Text>
          <Text tone="secondary">{error.message}</Text>
          {error.retryable ? (
            <Button label="Réessayer" onPress={() => void query.refetch()} />
          ) : null}
          <Button
            label="Retour au scan"
            variant="secondary"
            onPress={() => router.replace('/(merchant)/scan')}
          />
        </Card>
      </Screen>
    );
  }

  const client = query.data;
  const program =
    client.programs.find((item) => item.id === programId) ??
    client.programs.find((item) => item.rewardAvailable) ??
    client.programs[0];
  const clientName = fullName(client.firstName, client.lastName);

  if (!program) {
    return (
      <Screen>
        <AppBar
          title="Récompense indisponible"
          closeIcon
          onBack={() => router.replace('/(merchant)/(tabs)')}
        />
        <Card style={styles.errorCard}>
          <Text style={styles.errorEmoji}>🎁</Text>
          <Text variant="heading">Aucune récompense à utiliser</Text>
          <Text tone="secondary">
            Le solde de ce client a changé ou la récompense a déjà été utilisée.
          </Text>
          <Button
            label="Revenir à la fiche client"
            onPress={() =>
              router.replace({
                pathname: '/(merchant)/scanned/[clientCode]',
                params: { clientCode },
              })
            }
          />
        </Card>
      </Screen>
    );
  }

  const prepareRedeem = () => {
    actionRef.current = {
      requestId: newRequestId(),
      merchantId: merchant.id,
      clientCode,
      clientName,
      programId: program.id,
      programName: program.name,
      quantity,
    };
    setActionError(null);
    setModal('confirm');
  };

  const executeRedeem = () => {
    const action = actionRef.current;
    if (!action) return;

    redeem.mutate(action, {
      onSuccess: (result) => {
        setLastResult(result);
        setActionError(null);
        setModal(result.status === 'queued' ? 'queued' : 'success');
      },
      onError: (error) => {
        setActionError(toAppError(error));
        setModal('error');
      },
    });
  };

  const cost = quantity * program.threshold;
  const afterRedeem = program.stamps - cost;
  const maximum = Math.min(100, Math.floor(program.stamps / program.threshold));

  return (
    <Screen contentStyle={styles.content}>
      <AppBar
        eyebrow="✓ Client identifié"
        title=""
        closeIcon
        onBack={() => router.replace('/(merchant)/(tabs)')}
      />

      <OfflineBanner pendingCount={pending?.length ?? 0} />

      <Text style={styles.celebration}>🎉</Text>
      <View style={styles.heading}>
        <Text style={styles.title}>Récompense disponible !</Text>
        <Text style={styles.subtitle}>
          {client.firstName} dispose de {program.stamps} points chez {merchant.name}.
        </Text>
      </View>

      <Card
        surface={colors.rewardSurface}
        border={colors.rewardBorder}
        style={styles.rewardCard}
      >
        <Text variant="caption" tone="reward">
          RÉCOMPENSE À VALIDER
        </Text>
        <Text variant="title" tone="reward" style={styles.rewardName}>
          {program.emoji} {program.name}
        </Text>
        <View style={styles.progress}>
          <Text variant="subheading">{program.threshold} points par unité</Text>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 12 }}
          >
            <Button
              label="−"
              fullWidth={false}
              size="md"
              disabled={quantity <= 1 || redeem.isPending}
              onPress={() => setQuantity((q) => q - 1)}
            />
            <Text variant="heading">{quantity}</Text>
            <Button
              label="+"
              fullWidth={false}
              size="md"
              disabled={quantity >= maximum || redeem.isPending}
              onPress={() => setQuantity((q) => q + 1)}
            />
          </View>
        </View>
        <Text variant="label" tone="reward" style={styles.after}>
          {afterRedeem >= 0
            ? `Coût : ${cost} points · Reste : ${afterRedeem} points`
            : 'Solde insuffisant. Diminuez la quantité.'}
        </Text>
      </Card>

      <View style={styles.actions}>
        <Button
          label={`Valider ${quantity} récompense${quantity > 1 ? 's' : ''}`}
          disabled={afterRedeem < 0 || quantity > maximum}
          variant="reward"
          onPress={prepareRedeem}
          style={styles.rewardAction}
          trailing={<Text style={styles.whiteArrow}>→</Text>}
        />
        <Button
          label="Plus tard"
          variant="secondary"
          onPress={() => router.replace('/(merchant)/(tabs)')}
          trailing={<Text style={styles.grayArrow}>→</Text>}
        />
      </View>

      <ActionModal
        visible={modal === 'confirm'}
        emoji="🎁"
        title="Confirmer l’utilisation de la récompense ?"
        message={`${quantity} × ${program.name}`}
        confirmLabel="Confirmer"
        confirmVariant="reward"
        loading={redeem.isPending}
        onConfirm={executeRedeem}
        onCancel={() => {
          actionRef.current = null;
          setModal(null);
        }}
      >
        <Card surface={colors.rewardSurface} border={colors.rewardBorder}>
          <Text variant="bodyMedium" tone="reward">
            Cette action utilisera {cost} points.
          </Text>
          <Text variant="caption" tone="reward" style={styles.modalDetail}>
            Nouveau solde : {afterRedeem} points
          </Text>
        </Card>
      </ActionModal>

      <ActionModal
        visible={modal === 'success'}
        emoji="🎉"
        title="Récompense utilisée"
        message={`${program.name} — ${clientName}`}
        cancelLabel="Terminer"
        onCancel={() => {
          actionRef.current = null;
          setLastResult(null);
          setModal(null);
          router.replace({
            pathname: '/(merchant)/scanned/[clientCode]',
            params: { clientCode },
          });
        }}
      >
        {lastResult?.status === 'done' ? (
          <Card surface={colors.rewardSurface} border={colors.rewardBorder}>
            <Text variant="label" tone="reward" center>
              Nouveau solde : {lastResult.result.stamps_after ?? afterRedeem} points
            </Text>
          </Card>
        ) : null}
      </ActionModal>

      <ActionModal
        visible={modal === 'queued'}
        emoji="🕓"
        title="Validation mise en attente"
        message="La récompense n’est pas encore débitée. Vérifiez la synchronisation dès le retour du réseau."
        cancelLabel="Compris"
        onCancel={() => {
          actionRef.current = null;
          setModal(null);
          router.replace('/(merchant)/(tabs)');
        }}
      />

      <ActionModal
        visible={modal === 'error'}
        emoji="⚠️"
        title={actionError?.title ?? 'Impossible d’utiliser la récompense'}
        {...(actionError ? { message: actionError.message } : {})}
        cancelLabel="Fermer"
        confirmVariant="reward"
        loading={redeem.isPending}
        {...(actionError?.retryable
          ? { confirmLabel: 'Réessayer', onConfirm: executeRedeem }
          : {})}
        onCancel={() => setModal(null)}
      />
    </Screen>
  );
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const styles = StyleSheet.create({
  content: { gap: 20 },
  loading: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  errorCard: { marginTop: spacing.xl, gap: spacing.md },
  errorEmoji: { fontSize: 36, lineHeight: 44 },
  celebration: { fontSize: 44, lineHeight: 53 },
  heading: { gap: 8 },
  title: {
    color: colors.ink,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -1.05,
  },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15.5,
    lineHeight: 22,
  },
  rewardCard: { borderRadius: 22, padding: 20, gap: 14 },
  rewardName: { marginTop: 0 },
  progress: {
    borderTopWidth: 1,
    borderTopColor: colors.rewardBorder,
    paddingTop: spacing.lg,
  },
  after: { marginTop: 0 },
  actions: { gap: spacing.sm },
  rewardAction: { minHeight: 66, borderRadius: 18 },
  whiteArrow: { color: colors.white, fontSize: 20, lineHeight: 22 },
  grayArrow: { color: colors.textMuted, fontSize: 18, lineHeight: 20 },
  modalDetail: { marginTop: spacing.xs },
});
