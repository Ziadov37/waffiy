import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ProgressDisplay } from '@/components/loyalty';
import { Button, Card, Chip, Text, TextField } from '@/components/ui';
import { programStepSchema } from '@/features/auth/schemas';
import type { ProgramInput, ProgramStatus } from '@/features/merchant/api';
import { clearFieldError, collectFieldErrors, type FieldErrors } from '@/lib/forms';
import { cardTints, colors, radius, spacing, type CardTint } from '@/theme';
import { ThresholdStepper } from './ThresholdStepper';

const EMOJIS = ['🍔', '🍕', '☕', '🥤', '🥐', '💇', '🍰', '🎁'] as const;

export type ProgramFormValues = {
  program: ProgramInput;
  status: Extract<ProgramStatus, 'draft' | 'active'>;
};

type ProgramFormProps = {
  initial: ProgramFormValues;
  submitLabel: string;
  loading?: boolean;
  children?: ReactNode;
  onThresholdChange?: (threshold: number) => void;
  onSubmit: (values: ProgramFormValues) => void;
};

export function ProgramForm({
  initial,
  submitLabel,
  loading = false,
  children,
  onThresholdChange,
  onSubmit,
}: ProgramFormProps) {
  const initialTint =
    cardTints.find(
      (tint) =>
        tint.surface === initial.program.surfaceColor &&
        tint.border === initial.program.borderColor,
    ) ?? cardTints[0];
  const [program, setProgram] = useState<ProgramInput>({
    ...initial.program,
    surfaceColor: initialTint.surface,
    borderColor: initialTint.border,
  });
  const [status, setStatus] = useState<Extract<ProgramStatus, 'draft' | 'active'>>(
    initial.status,
  );
  const [tint, setTint] = useState<CardTint>(initialTint);
  const [errors, setErrors] = useState<FieldErrors<ProgramInput>>({});

  const changeThreshold = (threshold: number) => {
    setProgram((value) => ({ ...value, threshold }));
    onThresholdChange?.(threshold);
  };

  const submit = () => {
    const parsed = programStepSchema.safeParse(program);
    if (!parsed.success) {
      setErrors(collectFieldErrors<ProgramInput>(parsed.error));
      return;
    }

    onSubmit({
      program: {
        ...parsed.data,
        surfaceColor: tint.surface,
        borderColor: tint.border,
      },
      status,
    });
  };

  return (
    <View style={styles.form}>
      {children}

      <View style={styles.block}>
        <Text variant="label" tone="secondary">
          Statut
        </Text>
        <View style={styles.row}>
          <Chip
            label="Brouillon"
            active={status === 'draft'}
            onPress={() => setStatus('draft')}
          />
          <Chip
            label="Actif"
            active={status === 'active'}
            onPress={() => setStatus('active')}
          />
        </View>
      </View>

      <View style={styles.block}>
        <Text variant="label" tone="secondary">
          Coût en points
        </Text>
        <ThresholdStepper value={program.threshold} onChange={changeThreshold} />
      </View>

      <Card>
        <Text variant="caption" tone="tertiary">
          Aperçu client
        </Text>
        <View style={styles.preview}>
          <ProgressDisplay stamps={program.threshold - 1} threshold={program.threshold} />
          <Text variant="label" tone="secondary">
            {program.threshold - 1} / {program.threshold} points
          </Text>
        </View>
      </Card>

      <View style={styles.block}>
        <Text variant="label" tone="secondary">
          Icône
        </Text>
        <View style={styles.row}>
          {EMOJIS.map((emoji) => (
            <Pressable
              key={emoji}
              accessibilityRole="button"
              accessibilityLabel={`Icône ${emoji}`}
              accessibilityState={{ selected: program.emoji === emoji }}
              onPress={() => setProgram((value) => ({ ...value, emoji }))}
              style={[
                styles.emoji,
                program.emoji === emoji ? styles.emojiActive : styles.emojiIdle,
              ]}
            >
              <Text style={styles.emojiText}>{emoji}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <TextField
        label="Nom de la récompense"
        value={program.name}
        onChangeText={(name) => {
          setProgram((value) => ({ ...value, name }));
          setErrors((value) => clearFieldError(value, 'name'));
        }}
        placeholder="Burger gratuit"
        error={errors.name}
      />

      <TextField
        label="Description"
        optional
        value={program.description ?? ''}
        onChangeText={(description) => setProgram((value) => ({ ...value, description }))}
        placeholder="Burger classique au choix"
        multiline
      />

      <View style={styles.block}>
        <Text variant="label" tone="secondary">
          Apparence de la carte
        </Text>
        <View style={styles.tints}>
          {cardTints.map((item) => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={`Teinte ${item.label}`}
              accessibilityState={{ selected: tint.key === item.key }}
              onPress={() => setTint(item)}
              style={[
                styles.tint,
                {
                  backgroundColor: item.surface,
                  borderColor: tint.key === item.key ? colors.primary : item.border,
                  borderWidth: tint.key === item.key ? 3 : 1,
                },
              ]}
            />
          ))}
        </View>
      </View>

      <Button
        label={submitLabel}
        loading={loading}
        loadingLabel="Enregistrement…"
        onPress={submit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg, marginTop: spacing.md },
  block: { gap: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  preview: { gap: spacing.md, marginTop: spacing.md },
  emoji: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiActive: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  emojiIdle: { borderColor: colors.borderInput, backgroundColor: colors.white },
  emojiText: { fontSize: 24, lineHeight: 30 },
  tints: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tint: { width: 48, height: 48, borderRadius: radius.md },
});
