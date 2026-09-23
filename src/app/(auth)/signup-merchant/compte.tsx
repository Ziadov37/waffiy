import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppBar, Button, Card, Screen, Text, TextField } from '@/components/ui';
import { getAuthErrorMessage } from '@/features/auth/api';
import { useSignUpWithPassword } from '@/features/auth/hooks';
import { ownerStepSchema, type OwnerStepValues } from '@/features/auth/schemas';
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
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FieldErrors<OwnerStepValues>>({});
  const [formError, setFormError] = useState<string>();
  const signup = useSignUpWithPassword();

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

    signup.mutate(
      {
        email: parsed.data.email,
        password: parsed.data.password,
        metadata: {
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          ...(parsed.data.phone ? { phone: parsed.data.phone } : {}),
        },
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
        onError: (error) => setFormError(getAuthErrorMessage(error)),
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
        <TextField
          label="Téléphone"
          optional
          value={values.phone ?? ''}
          onChangeText={set('phone')}
          autoComplete="tel"
          keyboardType="phone-pad"
          placeholder="+213 5 00 00 00 00"
          error={errors.phone}
          hint="À vérifier par SMS avant de l’utiliser pour vous connecter."
        />
        <TextField
          label="Mot de passe"
          value={values.password}
          onChangeText={set('password')}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          error={errors.password}
          hint="8 caractères minimum."
        />
        <TextField
          label="Confirmer le mot de passe"
          value={values.confirmPassword}
          onChangeText={set('confirmPassword')}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={submit}
          error={errors.confirmPassword}
        />

        {formError ? (
          <Text variant="caption" tone="danger">
            {formError}
          </Text>
        ) : null}

        <Button
          label="Vérifier mon email"
          loadingLabel="Envoi du code…"
          loading={signup.isPending}
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
