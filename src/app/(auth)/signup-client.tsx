import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppBar, Button, Screen, Text, TextField } from '@/components/ui';
import { getAuthErrorMessage } from '@/features/auth/api';
import { useSignUpWithPassword } from '@/features/auth/hooks';
import { clientSignupSchema, type ClientSignupValues } from '@/features/auth/schemas';
import { clearFieldError, collectFieldErrors, type FieldErrors } from '@/lib/forms';
import { colors, spacing } from '@/theme';

export default function SignupClient() {
  const router = useRouter();
  const [values, setValues] = useState<ClientSignupValues>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FieldErrors<ClientSignupValues>>({});
  const [formError, setFormError] = useState<string>();
  const signup = useSignUpWithPassword();

  const set = (key: keyof ClientSignupValues) => (value: string) => {
    setValues((v) => ({
      ...v,
      [key]: value,
      ...(key === 'password' ? { confirmPassword: value } : {}),
    }));
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

    const { firstName, lastName, email, phone, password } = parsed.data;

    // Les métadonnées voyagent avec l'inscription : c'est le déclencheur
    // on_auth_user_created qui les transformera en profil, côté serveur.
    signup.mutate(
      {
        email,
        password,
        metadata: { firstName, lastName, ...(phone ? { phone } : {}) },
      },
      {
        onSuccess: () => router.push({ pathname: '/(auth)/verify', params: { email } }),
        onError: (error) => setFormError(getAuthErrorMessage(error)),
      },
    );
  };

  return (
    <Screen>
      <View style={styles.content}>
        <AppBar title="" />
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>Étape 1 sur 2</Text>
          <Text style={styles.pageTitle}>Créer mon compte</Text>
        </View>
        <View style={styles.progress}>
          <View style={styles.progressFill} />
        </View>

        <View style={styles.form}>
          <View style={styles.nameRow}>
            <TextField
              label="Prénom"
              value={values.firstName}
              onChangeText={set('firstName')}
              autoComplete="given-name"
              autoCapitalize="words"
              error={errors.firstName}
              containerStyle={styles.nameField}
            />
            <TextField
              label="Nom"
              value={values.lastName}
              onChangeText={set('lastName')}
              autoComplete="family-name"
              autoCapitalize="words"
              error={errors.lastName}
              containerStyle={styles.nameField}
            />
          </View>
          <TextField
            label="Téléphone"
            optional
            value={values.phone ?? ''}
            onChangeText={set('phone')}
            autoComplete="tel"
            keyboardType="phone-pad"
            placeholder="+213 5 00 00 00 00"
            error={errors.phone}
            hint="Vous pourrez le vérifier par SMS pour vous connecter avec ce numéro."
          />
          <TextField
            label="Email"
            value={values.email}
            onChangeText={set('email')}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            inputMode="email"
            placeholder="sarah@email.com"
            error={errors.email}
          />
          <TextField
            label="Mot de passe"
            value={values.password}
            onChangeText={set('password')}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            error={errors.password}
            returnKeyType="go"
            onSubmitEditing={submit}
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
            loading={signup.isPending}
            onPress={submit}
            trailing={<Text style={styles.arrow}>→</Text>}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 22 },
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
  progress: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: { width: '50%', height: '100%', backgroundColor: colors.primary },
  form: { gap: 14 },
  nameRow: { flexDirection: 'row', gap: 12 },
  nameField: { flex: 1 },
  arrow: { color: colors.white, fontSize: 18, lineHeight: 20 },
});
