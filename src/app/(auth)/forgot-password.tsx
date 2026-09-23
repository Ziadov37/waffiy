import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppBar, Button, Card, Screen, Text, TextField } from '@/components/ui';
import { getAuthErrorMessage } from '@/features/auth/api';
import { useRequestPasswordReset } from '@/features/auth/hooks';
import { emailSchema } from '@/features/auth/schemas';
import { colors, spacing } from '@/theme';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);
  const reset = useRequestPasswordReset();

  const submit = () => {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setError(undefined);
    reset.mutate(parsed.data, {
      // Message volontairement identique, que l'adresse existe ou non : le
      // formulaire ne devient pas un annuaire de comptes Waffiy.
      onSuccess: () => setSent(true),
      onError: (cause) => setError(getAuthErrorMessage(cause)),
    });
  };

  return (
    <Screen>
      <AppBar eyebrow="Connexion" title="Mot de passe oublié" />

      {sent ? (
        <Card
          surface={colors.primarySurface}
          border={colors.primaryBorder}
          style={styles.card}
        >
          <Text variant="heading">Vérifiez votre boîte email</Text>
          <Text tone="secondary">
            Si un compte correspond à cette adresse, un lien sécurisé vient d’être envoyé.
            Ouvrez-le sur ce téléphone pour choisir un nouveau mot de passe.
          </Text>
          <Button
            label="Retour à la connexion"
            onPress={() => router.replace('/(auth)/login')}
          />
        </Card>
      ) : (
        <View style={styles.form}>
          <Text tone="secondary">
            Indiquez l’adresse email vérifiée de votre compte client ou commerçant.
          </Text>
          <TextField
            label="Email"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setError(undefined);
            }}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            inputMode="email"
            returnKeyType="go"
            onSubmitEditing={submit}
            error={error}
          />
          <Button
            label="Recevoir le lien de récupération"
            loadingLabel="Envoi du lien…"
            loading={reset.isPending}
            onPress={submit}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { marginTop: spacing.xl, gap: spacing.lg },
  card: { marginTop: spacing.xl, gap: spacing.lg },
});
