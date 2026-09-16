import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppBar, Button, Screen, Text, TextField } from '@/components/ui';
import { useRequestEmailCode } from '@/features/auth/hooks';
import { emailSchema } from '@/features/auth/schemas';
import { toAppError } from '@/lib/errors';
import { spacing } from '@/theme';

/**
 * Connexion : saisie de l'adresse email.
 *
 * Aucun mot de passe (décision D1) : un code à 6 chiffres arrive par email.
 * `shouldCreateUser: false` est déterminant — sans lui, une faute de frappe
 * créerait silencieusement un compte vide, et l'utilisateur chercherait en
 * vain ses cartes de fidélité.
 */
export default function Login() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const request = useRequestEmailCode();

  const submit = () => {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setError(undefined);

    request.mutate(
      { email: parsed.data, createUser: false },
      {
        onSuccess: () =>
          router.push({
            pathname: '/(auth)/verify',
            params: { email: parsed.data, ...(role ? { role } : {}) },
          }),
        onError: (err) => setError(toAppError(err).message),
      },
    );
  };

  return (
    <Screen>
      <AppBar eyebrow="Connexion" title="Votre adresse email" />

      <View style={styles.form}>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          inputMode="email"
          autoFocus
          returnKeyType="go"
          onSubmitEditing={submit}
          placeholder="vous@exemple.com"
          error={error}
          hint="Un code à 6 chiffres vous sera envoyé par email."
        />

        <Button
          label="Recevoir mon code"
          loadingLabel="Envoi…"
          loading={request.isPending}
          onPress={submit}
        />

        <Text variant="caption" tone="tertiary" center>
          Pas encore de compte ? Revenez en arrière pour en créer un.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.xl, marginTop: spacing.lg },
});
