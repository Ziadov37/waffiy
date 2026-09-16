import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppBar, Button, Card, Screen, Text, TextField } from '@/components/ui';
import { useRequestEmailCode } from '@/features/auth/hooks';
import { ownerStepSchema, type OwnerStepValues } from '@/features/auth/schemas';
import { toAppError } from '@/lib/errors';
import { clearFieldError, collectFieldErrors, type FieldErrors } from '@/lib/forms';
import { useMerchantSignupStore } from '@/stores/merchant-signup';
import { spacing } from '@/theme';

export default function SignupMerchantCompte() {
  const router = useRouter();
  const commerce = useMerchantSignupStore((s) => s.commerce);
  const program = useMerchantSignupStore((s) => s.program);

  const [values, setValues] = useState<OwnerStepValues>({
    firstName: '',
    lastName: '',
    email: '',
  });
  const [errors, setErrors] = useState<FieldErrors<OwnerStepValues>>({});
  const [formError, setFormError] = useState<string>();
  const request = useRequestEmailCode();

  const set = (key: keyof OwnerStepValues) => (value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => clearFieldError(e, key));
  };

  const submit = () => {
    const parsed = ownerStepSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(collectFieldErrors<OwnerStepValues>(parsed.error));
      return;
    }
    setFormError(undefined);

    request.mutate(
      {
        email: parsed.data.email,
        createUser: true,
        metadata: { firstName: parsed.data.firstName, lastName: parsed.data.lastName },
      },
      {
        onSuccess: () =>
          router.push({
            pathname: '/(auth)/verify',
            // Le commerce n'est créé qu'APRÈS la vérification : create_merchant
            // exige une session, et un commerce créé avant validation de
            // l'email resterait orphelin si l'inscription était abandonnée.
            params: { email: parsed.data.email, next: 'merchant-setup' },
          }),
        onError: (err) => setFormError(toAppError(err).message),
      },
    );
  };

  return (
    <Screen>
      <AppBar eyebrow="Étape 3 sur 3 — Votre compte" title="Créer mon compte" />

      <View style={styles.form}>
        {commerce && program ? (
          <Card surface="#EFFBF4" border="#C8EEDA">
            <Text variant="label" tone="secondary">
              Récapitulatif
            </Text>
            <Text variant="subheading" style={styles.recapLine}>
              {program.emoji} {commerce.name}
            </Text>
            <Text variant="caption" tone="secondary">
              {commerce.city} — {program.threshold} visites = {program.name}
            </Text>
          </Card>
        ) : null}

        <TextField
          label="Prénom"
          value={values.firstName}
          onChangeText={set('firstName')}
          autoCapitalize="words"
          autoComplete="given-name"
          error={errors.firstName}
        />
        <TextField
          label="Nom"
          value={values.lastName}
          onChangeText={set('lastName')}
          autoCapitalize="words"
          autoComplete="family-name"
          error={errors.lastName}
        />
        <TextField
          label="Email"
          value={values.email}
          onChangeText={set('email')}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          inputMode="email"
          placeholder="vous@exemple.com"
          error={errors.email}
          hint="C’est avec cette adresse que vous vous connecterez."
        />

        {formError ? (
          <Text variant="caption" tone="danger">
            {formError}
          </Text>
        ) : null}

        <Button
          label="Créer mon commerce"
          loadingLabel="Envoi du code…"
          loading={request.isPending}
          onPress={submit}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg, marginTop: spacing.md },
  recapLine: { marginTop: spacing.sm },
});
