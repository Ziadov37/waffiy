import { useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ActionModal, OfflineBanner } from '@/components/feedback';
import { ProgressDisplay } from '@/components/loyalty';
import { ScanClientHeader, ScannedProgramCard } from '@/components/merchant';
import { AppBar, Button, Card, Screen, Text } from '@/components/ui';
import { useMyMerchant } from '@/features/auth/hooks';
import {
  useCreditVisit,
  usePendingActions,
  useResolveClient,
  type ScanMutationInput,
  type ScanMutationResult,
} from '@/features/scan/hooks';
import { toAppError, type AppError } from '@/lib/errors';
import { countLabel, fullName } from '@/lib/format';
import { newRequestId } from '@/lib/offline/queue';
import { colors, spacing } from '@/theme';

type ModalState = 'confirm' | 'success' | 'queued' | 'error' | null;

export default function ScannedClient() {
  const router = useRouter();
  const params = useLocalSearchParams<{ clientCode?: string | string[] }>();
  const clientCode = Array.isArray(params.clientCode)
    ? params.clientCode[0]
    : params.clientCode;
  const { data: merchant } = useMyMerchant();
  const query = useResolveClient(merchant?.id, clientCode);
  const credit = useCreditVisit();
  const { data: pending } = usePendingActions();

  const [selectedId, setSelectedId] = useState<string>();
  const [modal, setModal] = useState<ModalState>(null);
  const [actionError, setActionError] = useState<AppError | null>(null);
  const [lastResult, setLastResult] = useState<ScanMutationResult | null>(null);
  const actionRef = useRef<ScanMutationInput | null>(null);

  if (query.isPending || !merchant) {
    return (
      <Screen>
        <AppBar title="Client scanné" closeIcon />
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text tone="secondary">Identification du client…</Text>
        </View>
      </Screen>
    );
  }

  if (query.error || !query.data || !clientCode) {
    const error = toAppError(query.error);
    return (
      <Screen>
        <AppBar title="Scan impossible" closeIcon />
        <Card style={styles.errorCard}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text variant="heading">{error.title}</Text>
          <Text tone="secondary">{error.message}</Text>
          {error.retryable ? (
            <Button label="Réessayer" onPress={() => void query.refetch()} />
          ) : null}
          <Button
            label="Scanner un autre client"
            variant="secondary"
            onPress={() => router.replace('/(merchant)/scan')}
          />
        </Card>
      </Screen>
    );
  }

  const client = query.data;
  const program =
    client.programs.find((item) => item.id === selectedId) ??
    client.programs.find((item) => item.id === client.suggestedProgramId) ??
    client.programs[0];
  const clientName = fullName(client.firstName, client.lastName);

  const openReward = () => {
    if (!program) return;
    router.push({
      pathname: '/(merchant)/reward/[clientCode]',
      params: { clientCode, programId: program.id },
    });
  };

  const prepareCredit = () => {
    if (!program || !merchant) return;
    actionRef.current = {
      requestId: newRequestId(),
      merchantId: merchant.id,
      clientCode,
      clientName,
      programId: program.id,
      programName: program.name,
    };
    setActionError(null);
    setModal('confirm');
  };

  const executeCredit = () => {
    const action = actionRef.current;
    if (!action) return;

    credit.mutate(action, {
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

  const finishCredit = () => {
    const unlocked =
      lastResult?.status === 'done' && lastResult.result.reward_available === true;
    actionRef.current = null;
    setModal(null);
    setLastResult(null);

    if (unlocked) {
      openReward();
      return;
    }
    void query.refetch();
  };

  return (
    <Screen contentStyle={styles.content}>
      <AppBar
        eyebrow="✓ Client identifié"
        title=""
        closeIcon
        onBack={() => router.replace('/(merchant)/(tabs)')}
      />

      <OfflineBanner pendingCount={pending?.length ?? 0} />

      <View style={styles.client}>
        <ScanClientHeader
          firstName={client.firstName}
          lastName={client.lastName}
          joinedAt={client.joinedAt}
          highlighted={Boolean(program?.rewardAvailable)}
        />
      </View>

      {!client.isEnrolled ? (
        <Card
          border={colors.rewardBorder}
          surface={colors.rewardSurface}
          style={styles.notice}
        >
          <Text style={styles.noticeEmoji}>📲</Text>
          <Text variant="heading">Ce client n’a pas encore votre carte</Text>
          <Text tone="secondary">
            Affichez votre QR d’inscription. Le client doit le scanner lui-même avant que
            vous puissiez créditer une visite.
          </Text>
          <Button
            label="Afficher le QR d’inscription"
            variant="reward"
            onPress={() => router.push('/(merchant)/enroll-qr')}
          />
          <Button
            label="Scanner à nouveau"
            variant="secondary"
            onPress={() => router.replace('/(merchant)/scan')}
          />
        </Card>
      ) : (
        <>
          <View style={styles.sectionHeader}>
            <Text variant="label">RÉCOMPENSES AU CHOIX</Text>
            <Text variant="caption" tone="tertiary">
              {countLabel(client.programs.length, 'programme')}
            </Text>
          </View>

          <View style={styles.programs}>
            {client.programs.map((item) => (
              <ScannedProgramCard
                key={item.id}
                program={item}
                selected={item.id === program?.id}
                onPress={() => setSelectedId(item.id)}
              />
            ))}
          </View>

          {program ? (
            <Card style={styles.summary}>
              <View style={styles.summaryHead}>
                <View style={styles.summaryCount}>
                  <Text
                    style={[
                      styles.summaryValue,
                      { color: program.rewardAvailable ? colors.reward : colors.ink },
                    ]}
                  >
                    {program.stamps} points
                  </Text>
                </View>
                <Text
                  style={[
                    styles.summaryRemaining,
                    { color: program.rewardAvailable ? colors.reward : colors.primary },
                  ]}
                >
                  {program.rewardAvailable
                    ? 'Récompense disponible'
                    : `${countLabel(program.threshold - program.stamps, 'point')} pour ce choix`}
                </Text>
              </View>

              <View style={styles.summaryProgress}>
                <ProgressDisplay
                  stamps={program.stamps}
                  threshold={program.threshold}
                  size={38}
                />
              </View>

              <View style={styles.rewardLine}>
                <Text variant="caption" tone="tertiary">
                  RÉCOMPENSE
                </Text>
                <Text variant="bodyMedium">🎁 {program.name}</Text>
              </View>
            </Card>
          ) : null}

          {program?.rewardAvailable ? (
            <Button
              label="Utiliser la récompense"
              variant="reward"
              onPress={openReward}
              style={styles.primaryAction}
            />
          ) : null}
          {
            <>
              <Button
                label={
                  program && program.secondsUntilNextCredit > 0
                    ? cooldownLabel(program.secondsUntilNextCredit)
                    : '＋ Ajouter 1 point au solde'
                }
                disabled={!program || program.secondsUntilNextCredit > 0}
                onPress={prepareCredit}
                style={styles.primaryAction}
              />
              {program && program.secondsUntilNextCredit > 0 ? (
                <Text variant="caption" tone="tertiary" center>
                  Le délai anti-fraude empêche un second crédit immédiat.
                </Text>
              ) : null}
            </>
          }

          <Card style={styles.totals} padded={false}>
            <View style={styles.totalRow}>
              <Text tone="secondary">Total visites</Text>
              <Text variant="bodyMedium">{client.totalVisits}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text tone="secondary">Récompenses utilisées</Text>
              <Text variant="bodyMedium">{client.rewardsRedeemed}</Text>
            </View>
          </Card>
        </>
      )}

      {program ? (
        <>
          <ActionModal
            visible={modal === 'confirm'}
            title={`Ajouter 1 point à ${client.firstName} ?`}
            message={`${merchant.name} : ${program.stamps} → ${program.stamps + 1} points, utilisables pour toutes les récompenses.`}
            confirmLabel="Confirmer l’ajout"
            loading={credit.isPending}
            onConfirm={executeCredit}
            onCancel={() => {
              actionRef.current = null;
              setModal(null);
            }}
          >
            <Card surface={colors.primarySurface} border={colors.primaryBorder}>
              <Text variant="bodyMedium" tone="primary">
                +1 point — {merchant.name}
              </Text>
            </Card>
          </ActionModal>

          <ActionModal
            visible={modal === 'success'}
            emoji="✓"
            title="+1 point ajouté"
            {...(lastResult?.status === 'done'
              ? {
                  message: `${lastResult.result.stamps_after ?? program.stamps + 1} points disponibles`,
                }
              : {})}
            cancelLabel={
              lastResult?.status === 'done' && lastResult.result.reward_available
                ? 'Voir la récompense'
                : 'Continuer'
            }
            onCancel={finishCredit}
          />

          <ActionModal
            visible={modal === 'queued'}
            emoji="🕓"
            title="Visite mise en attente"
            message="La visite n’est pas encore créditée. Elle sera envoyée automatiquement au retour du réseau."
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
            title={actionError?.title ?? 'Impossible d’ajouter la visite'}
            {...(actionError ? { message: actionError.message } : {})}
            cancelLabel="Fermer"
            loading={credit.isPending}
            {...(actionError?.retryable
              ? { confirmLabel: 'Réessayer', onConfirm: executeCredit }
              : {})}
            onCancel={() => setModal(null)}
          />
        </>
      ) : null}
    </Screen>
  );
}

function cooldownLabel(seconds: number): string {
  if (seconds < 60) return `Patientez ${seconds} s`;
  return `Patientez ${Math.ceil(seconds / 60)} min`;
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
  errorEmoji: { fontSize: 32, lineHeight: 40 },
  client: {},
  notice: { marginTop: spacing.xl, gap: spacing.md },
  noticeEmoji: { fontSize: 36, lineHeight: 44 },
  sectionHeader: {
    borderTopWidth: 2,
    borderTopColor: colors.ink,
    paddingTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  programs: { gap: spacing.sm },
  summary: { borderRadius: 22, padding: 20, gap: 16 },
  summaryHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  summaryCount: { gap: 0 },
  summaryValue: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 36,
    lineHeight: 38,
    letterSpacing: -1.44,
  },
  summaryRemaining: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'right',
    maxWidth: 170,
  },
  summaryProgress: {},
  rewardLine: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  primaryAction: { minHeight: 66, borderRadius: 18 },
  totals: { borderRadius: 20, overflow: 'hidden' },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F6',
  },
});
