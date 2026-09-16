import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppBar, Button, Screen, Text, TextField } from '@/components/ui';
import { useRequestEmailCode } from '@/features/auth/hooks';
import { clientSignupSchema, type ClientSignupValues } from '@/features/auth/schemas';
import { toAppError } from '@/lib/errors';
import { clearFieldError, collectFieldErrors, type FieldErrors } from '@/lib/forms';
import { spacing } from '@/theme';

export default function SignupClient() {
  const router = useRouter();
  const [values, setValues] = useState<ClientSignupValues>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [errors, setErrors] = useState<FieldErrors<ClientSignupValues>>({});
  const [formError, setFormError] = useState<string>();
  const request = useRequestEmailCode();

  const set = (key: keyof ClientSignupValues) => (value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    // L'erreur disparaît dès la première correction : la laisser affichée
    // pendant que l'on corrige est désagréable et inutile.
    setErrors((e) => clearFieldError(e, key));
  };

  const submit = () => {
    const parsed = clientSignupSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(collectFieldErrors<ClientSignupValues>(parsed.error));
      return;
    }
    setFormError(undefined);

    const { firstName, lastName, email, phone } = parsed.data;

    // Les métadonnées voyagent avec la demande de code : c'est le déclencheur
    // on_auth_user_created qui les transformera en profil, côté serveur.
    request.mutate(
      {
        email,
        createUser: true,
        metadata: { firstName, lastName, ...(phone ? { phone } : {}) },
      },
      {
        onSuccess: () =>
          router.push({ pathname: '/(auth)/verify', params: { email } }),
        onError: (err) => setFormError(toAppError(err).message),
      },
    );
  };

  return (
    <Screen>
      <AppBar eyebrow="Étape 1 sur 2" title="Créer mon compte" />

      <View style={styles.form}>
        <TextField
          label="Prénom"
          value={values.firstName}
          onChangeText={set('firstName')}
          autoComplete="given-name"
          autoCapitalize="words"
          error={errors.firstName}
        />
        <TextField
          label="Nom"
          value={values.lastName}
          onChangeText={set('lastName')}
          autoComplete="family-name"
          autoCapitalize="words"
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
          hint="Sert au commerçant à vous retrouver si votre écran est cassé."
        />

        {formError ? (
          <Text variant="caption" tone="danger">
            {formError}
          </Text>
        ) : null}

        <Text variant="caption" tone="tertiary">
          Un code de vérification sera envoyé par email à l’adresse indiquée.
        </Text>

        <Button
          label="Continuer"
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
});
