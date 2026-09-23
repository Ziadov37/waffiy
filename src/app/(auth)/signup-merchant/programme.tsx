import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppBar, Button, Card, Screen, Text, TextField } from '@/components/ui';
import { ProgressDisplay } from '@/components/loyalty';
import { ThresholdStepper } from '@/components/merchant';
import { programStepSchema, type ProgramStepValues } from '@/features/auth/schemas';
import { useSession } from '@/features/auth/hooks';
import { clearFieldError, collectFieldErrors, type FieldErrors } from '@/lib/forms';
import { useMerchantSignupStore } from '@/stores/merchant-signup';
import { colors, spacing } from '@/theme';

export default function SignupMerchantProgramme() {
  const router = useRouter();
  const session = useSession();
  const saved = useMerchantSignupStore((s) => s.program);
  const setProgram = useMerchantSignupStore((s) => s.setProgram);

  const [values, setValues] = useState<ProgramStepValues>(
    saved ?? { name: '', emoji: '🎁', description: '', threshold: 10 },
  );
  const [errors, setErrors] = useState<FieldErrors<ProgramStepValues>>({});

  const submit = () => {
    const parsed = programStepSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(collectFieldErrors<ProgramStepValues>(parsed.error));
      return;
    }
    setProgram(parsed.data);
    // Un client déjà connecté garde son compte : il ne renseigne que son
    // commerce et son programme. Un nouvel utilisateur crée ensuite son compte.
    router.push(
      session
        ? '/(auth)/signup-merchant/creating'
        : '/(auth)/signup-merchant/compte',
    );
  };

  return (
    <Screen>
      <View style={styles.content}>
        <AppBar title="" />
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>
            Étape 2 sur {session ? 2 : 3} — Programme
          </Text>
          <Text style={styles.pageTitle}>Configurez votre programme</Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[styles.progressFill, session ? styles.progressFillExisting : null]}
          />
        </View>

        <View style={styles.form}>
          <Card style={styles.programCard}>
            <Text style={styles.cardTitle}>Coût de la récompense en points</Text>
            <ThresholdStepper
              value={values.threshold}
              onChange={(threshold) => setValues((v) => ({ ...v, threshold }))}
            />
            <View style={styles.preview}>
              <Text style={styles.previewLabel}>Aperçu client</Text>
              <ProgressDisplay
                stamps={values.threshold - 1}
                threshold={values.threshold}
                size={26}
              />
              <Text variant="label" tone="primary">
                {values.threshold - 1} / {values.threshold} points
              </Text>
            </View>
          </Card>

          <TextField
            label="Quelle récompense souhaitez-vous offrir ?"
            value={values.name}
            onChangeText={(name) => {
              setValues((v) => ({ ...v, name }));
              setErrors((e) => clearFieldError(e, 'name'));
            }}
            placeholder="Burger gratuit"
            error={errors.name}
          />

          <TextField
            label="Description"
            optional
            value={values.description ?? ''}
            onChangeText={(description) => setValues((v) => ({ ...v, description }))}
            placeholder="Burger classique au choix"
            multiline
          />

          <View style={styles.note}>
            <Text style={styles.noteText}>
              Vous pourrez ajouter d’autres récompenses depuis Réglages. Les clients
              cumulent un solde de points commun à votre commerce et choisissent
              les récompenses qu’ils souhaitent obtenir.
            </Text>
          </View>

          <Button
            label={session ? 'Créer mon espace commerçant' : 'Créer mon programme'}
            onPress={submit}
            trailing={<Text style={styles.arrow}>→</Text>}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 20 },
  heading: { gap: spacing.sm },
  eyebrow: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.54,
    textTransform: 'uppercase',
    fontFamily: 'Manrope_700Bold',
  },
  pageTitle: {
    color: colors.ink,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 27,
    lineHeight: 33,
    letterSpacing: -0.68,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: { width: '66%', height: '100%', backgroundColor: colors.primary },
  progressFillExisting: { width: '100%' },
  form: { gap: 16 },
  programCard: { borderRadius: 20, padding: 18, gap: 16 },
  cardTitle: {
    color: colors.ink,
    fontFamily: 'Manrope_700Bold',
    fontSize: 14.5,
    lineHeight: 20,
  },
  preview: { gap: 10, borderTopWidth: 1, borderTopColor: '#EEF1F6', paddingTop: 16 },
  previewLabel: {
    color: colors.textMuted,
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.54,
    textTransform: 'uppercase',
  },
  note: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderInput,
    borderRadius: 18,
    padding: 16,
  },
  noteText: {
    color: '#6B7280',
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    lineHeight: 20,
  },
  arrow: { color: colors.white, fontSize: 18, lineHeight: 20 },
});
