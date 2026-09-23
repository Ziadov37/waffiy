import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ActionModal } from '@/components/feedback';
import { ProgramForm, type ProgramFormValues } from '@/components/merchant';
import { AppBar, Button, Card, Screen, Text } from '@/components/ui';
import {
  usePrograms,
  useDeleteProgram,
  useSetThreshold,
  useThresholdImpact,
  useUpdateProgram,
} from '@/features/merchant/hooks';
import { toAppError } from '@/lib/errors';
import { colors, spacing } from '@/theme';

export default function EditProgram() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const programId = Array.isArray(params.id) ? params.id[0] : params.id;
  const programs = usePrograms();
  const update = useUpdateProgram();
  const remove = useDeleteProgram();
  const setThreshold = useSetThreshold();
  const [threshold, setDraftThreshold] = useState<number>();
  const impact = useThresholdImpact(programId, threshold ?? 10);
  const [pending, setPending] = useState<ProgramFormValues | null>(null);
  const [showThresholdConfirm, setShowThresholdConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string>();

  const program = programs.data?.find((item) => item.id === programId);

  if (programs.isPending) {
    return (
      <Screen>
        <AppBar title="Programme" />
        <Card>
          <Text tone="secondary">Chargement du programme…</Text>
        </Card>
      </Screen>
    );
  }

  if (!program) {
    return (
      <Screen>
        <AppBar title="Programme introuvable" />
        <Card style={styles.state}>
          <Text tone="secondary">Ce programme a été archivé ou supprimé.</Text>
          <Button
            label="Retour aux programmes"
            onPress={() => router.replace('/(merchant)/programs')}
          />
        </Card>
      </Screen>
    );
  }

  const initial: ProgramFormValues = {
    program: {
      name: program.name,
      emoji: program.emoji,
      description: program.description ?? '',
      threshold: program.threshold,
      ...(program.surface_color ? { surfaceColor: program.surface_color } : {}),
      ...(program.border_color ? { borderColor: program.border_color } : {}),
    },
    status: program.status === 'active' ? 'active' : 'draft',
  };

  const persist = async (values: ProgramFormValues, confirmed: boolean) => {
    setError(undefined);
    try {
      if (values.program.threshold !== program.threshold) {
        await setThreshold.mutateAsync({
          programId: program.id,
          threshold: values.program.threshold,
          confirmed,
        });
      }

      await update.mutateAsync({
        id: program.id,
        name: values.program.name,
        emoji: values.program.emoji,
        description: values.program.description ?? null,
        status: values.status,
        surface_color: values.program.surfaceColor ?? null,
        border_color: values.program.borderColor ?? null,
      });
      setPending(null);
      setShowThresholdConfirm(false);
      router.replace('/(merchant)/programs');
    } catch (cause) {
      const appError = toAppError(cause);
      if (appError.code === 'THRESHOLD_CHANGE_REQUIRES_CONFIRMATION') {
        setPending(values);
        setShowThresholdConfirm(true);
        return;
      }
      setError(appError.message);
      setShowThresholdConfirm(false);
    }
  };

  const submit = async (values: ProgramFormValues) => {
    if (values.program.threshold !== program.threshold) {
      const latest = await impact.refetch();
      if (latest.data?.requiresWarning) {
        setPending(values);
        setShowThresholdConfirm(true);
        return;
      }
    }
    await persist(values, false);
  };

  const archive = () => {
    update.mutate(
      { id: program.id, status: 'archived' },
      {
        onSuccess: () => router.replace('/(merchant)/programs'),
        onError: (cause) => {
          setShowArchiveConfirm(false);
          setError(toAppError(cause).message);
        },
      },
    );
  };

  const thresholdChanged = threshold !== undefined && threshold !== program.threshold;

  return (
    <Screen>
      <AppBar eyebrow="Programme" title={`${program.emoji} ${program.name}`} />

      <ProgramForm
        initial={initial}
        submitLabel="Enregistrer les modifications"
        loading={update.isPending || setThreshold.isPending || remove.isPending}
        onThresholdChange={setDraftThreshold}
        onSubmit={(values) => void submit(values)}
      >
        {thresholdChanged && impact.data?.requiresWarning ? (
          <Card surface={colors.rewardSurface} border={colors.rewardBorder}>
            <View style={styles.warning}>
              <Text style={styles.warningEmoji}>⚠️</Text>
              <View style={styles.warningCopy}>
                <Text variant="bodyMedium" tone="reward">
                  Des clients progressent déjà
                </Text>
                <Text variant="caption" tone="reward">
                  {impact.data.inProgressCount} progression
                  {impact.data.inProgressCount > 1 ? 's' : ''} en cours. Ce changement{' '}
                  {impact.data.wouldUnlock > 0
                    ? `débloquerait ${impact.data.wouldUnlock} récompense${impact.data.wouldUnlock > 1 ? 's' : ''}.`
                    : `retarderait ${impact.data.wouldDelay} client${impact.data.wouldDelay > 1 ? 's' : ''}.`}
                </Text>
              </View>
            </View>
          </Card>
        ) : null}

        {error ? (
          <Card border={colors.danger} surface={colors.dangerSurface}>
            <Text tone="danger">{error}</Text>
          </Card>
        ) : null}
      </ProgramForm>

      <Button
        label="Archiver ce programme"
        variant="ghost"
        disabled={update.isPending || setThreshold.isPending || remove.isPending}
        onPress={() => setShowArchiveConfirm(true)}
        style={styles.archive}
      />

      <Button
        label="Supprimer ce programme"
        variant="danger"
        disabled={update.isPending || setThreshold.isPending || remove.isPending}
        onPress={() => setShowDeleteConfirm(true)}
        style={styles.archive}
      />

      <ActionModal
        visible={showDeleteConfirm}
        emoji="🗑️"
        title="Supprimer ce programme ?"
        message={`« ${program.name} » sera retiré de vos programmes et des cartes clients. S'il a déjà été utilisé, il sera archivé pour conserver les visites et les récompenses acquises.`}
        confirmLabel="Supprimer"
        confirmVariant="danger"
        loading={remove.isPending}
        loadingLabel="Suppression…"
        onConfirm={() => {
          setError(undefined);
          remove.mutate(program.id, {
            onSuccess: () => router.replace('/(merchant)/programs'),
            onError: (cause) => {
              setShowDeleteConfirm(false);
              setError(toAppError(cause).message);
            },
          });
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ActionModal
        visible={showThresholdConfirm}
        emoji="⚠️"
        title="Confirmer le changement de seuil ?"
        message={
          impact.data
            ? `${impact.data.inProgressCount} client${impact.data.inProgressCount > 1 ? 's ont' : ' a'} une progression en cours.`
            : 'Des clients progressent déjà sur ce programme.'
        }
        confirmLabel="Modifier malgré tout"
        confirmVariant="reward"
        loading={setThreshold.isPending || update.isPending}
        onConfirm={() => {
          if (pending) void persist(pending, true);
        }}
        onCancel={() => {
          setPending(null);
          setShowThresholdConfirm(false);
        }}
      />

      <ActionModal
        visible={showArchiveConfirm}
        emoji="🗃️"
        title="Archiver ce programme ?"
        message="Il disparaîtra des nouveaux scans, mais les récompenses déjà acquises resteront utilisables."
        confirmLabel="Archiver"
        confirmVariant="danger"
        loading={update.isPending}
        onConfirm={archive}
        onCancel={() => setShowArchiveConfirm(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  state: { marginTop: spacing.xl, gap: spacing.md },
  warning: { flexDirection: 'row', gap: spacing.md },
  warningEmoji: { fontSize: 20, lineHeight: 26 },
  warningCopy: { flex: 1, gap: spacing.xs },
  archive: { marginTop: spacing.lg },
});
