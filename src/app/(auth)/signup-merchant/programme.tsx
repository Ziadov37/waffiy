import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppBar, Button, Card, Screen, Text, TextField } from '@/components/ui';
import { ProgressDisplay } from '@/components/loyalty';
import { ThresholdStepper } from '@/components/merchant';
import { programStepSchema, type ProgramStepValues } from '@/features/auth/schemas';
import { clearFieldError, collectFieldErrors, type FieldErrors } from '@/lib/forms';
import { useMerchantSignupStore } from '@/stores/merchant-signup';
import { spacing } from '@/theme';

const EMOJIS = ['🍔', '🍕', '☕', '🥤', '🥐', '💇', '🍰', '🎁'] as const;

export default function SignupMerchantProgramme() {
  const router = useRouter();
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
    router.push('/(auth)/signup-merchant/compte');
  };

  return (
    <Screen>
      <AppBar eyebrow="Étape 2 sur 3 — Programme" title="Configurez votre programme" />

      <View style={styles.form}>
        <View style={styles.block}>
          <Text variant="label" tone="secondary">
            Nombre de visites nécessaires
          </Text>
          <ThresholdStepper
            value={values.threshold}
            onChange={(threshold) => setValues((v) => ({ ...v, threshold }))}
          />
        </View>

        {/* Aperçu client : le commerçant voit exactement ce que verra son
            client. Montrer le seuil moins un rend la progression lisible —
            une grille entièrement vide ne dit rien. */}
        <Card>
          <Text variant="caption" tone="tertiary">
            Aperçu client
          </Text>
          <View style={styles.preview}>
            <ProgressDisplay stamps={values.threshold - 1} threshold={values.threshold} />
            <Text variant="label" tone="secondary">
              {values.threshold - 1} / {values.threshold} visites
            </Text>
          </View>
        </Card>

        <View style={styles.block}>
          <Text variant="label" tone="secondary">
            Icône
          </Text>
          <View style={styles.emojis}>
            {EMOJIS.map((e) => (
              <Text
                key={e}
                onPress={() => setValues((v) => ({ ...v, emoji: e }))}
                style={[
                  styles.emoji,
                  values.emoji === e ? styles.emojiActive : styles.emojiIdle,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Icône ${e}`}
                accessibilityState={{ selected: values.emoji === e }}
              >
                {e}
              </Text>
            ))}
          </View>
        </View>

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

        <Text variant="caption" tone="tertiary">
          Vous pourrez créer d’autres programmes — une pizza toutes les 5 visites, une
          boisson toutes les 8 — depuis Réglages. Chaque client progresse sur chacun d’eux
          séparément.
        </Text>

        <Button label="Continuer" onPress={submit} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg, marginTop: spacing.md },
  block: { gap: spacing.sm },
  preview: { gap: spacing.md, marginTop: spacing.md },
  emojis: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  emoji: {
    fontSize: 24,
    lineHeight: 30,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  emojiActive: { borderColor: '#16A36A', backgroundColor: '#EFFBF4' },
  emojiIdle: { borderColor: '#DFE3EB', backgroundColor: '#FFFFFF' },
});
