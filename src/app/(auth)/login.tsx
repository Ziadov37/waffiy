import { useState } from 'react';
import { type Href, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppBar, Button, Screen, Text, TextField } from '@/components/ui';
import { getAuthErrorMessage } from '@/features/auth/api';
import { usePasswordLogin } from '@/features/auth/hooks';
import { loginSchema, type LoginValues } from '@/features/auth/schemas';
import { clearFieldError, collectFieldErrors, type FieldErrors } from '@/lib/forms';
import { useSessionStore } from '@/stores/session';
import { colors, spacing } from '@/theme';

/** Connexion quotidienne par email ou téléphone et mot de passe, sans OTP. */
export default function Login() {
  const router = useRouter();
  const setActiveRole = useSessionStore((state) => state.setActiveRole);
  const pendingJoinCode = useSessionStore((state) => state.pendingJoinCode);
  const [values, setValues] = useState<LoginValues>({ identifier: '', password: '' });
  const [errors, setErrors] = useState<FieldErrors<LoginValues>>({});
  const [formError, setFormError] = useState<string>();
  const login = usePasswordLogin();

  const set = (key: keyof LoginValues) => (value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => clearFieldError(current, key));
    setFormError(undefined);
  };

  const submit = () => {
    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(collectFieldErrors<LoginValues>(parsed.error));
      return;
    }
    setFormError(undefined);

    login.mutate(parsed.data, {
      onSuccess: () => {
        // Un compte qui possède un commerce arrive par défaut dans son espace
        // commerçant. L'aiguillage racine retombera naturellement côté client
        // si aucun commerce n'est rattaché à ce compte.
        setActiveRole('merchant');
        const destination: Href = pendingJoinCode
          ? (`/join?code=${encodeURIComponent(pendingJoinCode)}` as Href)
          : '/';
        router.replace(destination);
      },
      onError: (error) => setFormError(getAuthErrorMessage(error)),
    });
  };

  return (
    <Screen>
      <AppBar title="" />
      <Text style={styles.title}>Connexion</Text>

      <View style={styles.form}>
        <TextField
          label="Email ou téléphone vérifié"
          value={values.identifier}
          onChangeText={set('identifier')}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          textContentType="username"
          autoFocus
          returnKeyType="next"
          placeholder="vous@exemple.com ou 05…"
          error={errors.identifier}
        />

        <TextField
          label="Mot de passe"
          value={values.password}
          onChangeText={set('password')}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
          error={errors.password}
        />

        <Button
          label="Mot de passe oublié ?"
          variant="ghost"
          size="md"
          fullWidth={false}
          onPress={() => router.push('/(auth)/forgot-password')}
          style={styles.forgotButton}
        />

        {formError ? (
          <Text variant="caption" tone="danger">
            {formError}
          </Text>
        ) : null}

        <Button
          label="Se connecter"
          loadingLabel="Connexion…"
          loading={login.isPending}
          onPress={submit}
          trailing={<Text style={styles.arrow}>→</Text>}
        />

        <Button
          label="Créer un compte"
          variant="ghost"
          size="md"
          fullWidth={false}
          onPress={() => router.push('/(auth)/role')}
          style={styles.signupButton}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 27,
    lineHeight: 33,
    letterSpacing: -0.68,
    textAlign: 'center',
  },
  form: { gap: 14, marginTop: spacing.xl },
  forgotButton: { alignSelf: 'flex-end', marginTop: -8 },
  signupButton: { alignSelf: 'center' },
  arrow: { color: colors.white, fontSize: 18, lineHeight: 20 },
});
