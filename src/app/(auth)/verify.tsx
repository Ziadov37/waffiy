import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppBar, Button, Screen, Text, TextField } from '@/components/ui';
import { useRequestEmailCode, useVerifyEmailCode } from '@/features/auth/hooks';
import { otpSchema } from '@/features/auth/schemas';
import { toAppError } from '@/lib/errors';
import { spacing, typography } from '@/theme';

const RESEND_DELAY_SECONDS = 60;

/**
 * Saisie du code à 6 chiffres.
 *
 * Code plutôt que lien magique : un lien impose un lien profond, fragile sur
 * mobile et rompu si l'email s'ouvre dans un navigateur différent de celui de
 * l'appareil. Le code se recopie, quelle que soit l'application de messagerie.
 */
export default function Verify() {
  const router = useRouter();
  const { email, next } = useLocalSearchParams<{ email: string; next?: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [cooldown, setCooldown] = useState(RESEND_DELAY_SECONDS);

  const verify = useVerifyEmailCode();
  const resend = useRequestEmailCode();

  // Le serveur impose 60 s entre deux envois (supabase/config.toml). Afficher
  // le décompte évite que l'utilisateur martèle un bouton qui échouerait.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((s) => Math.max(s - 1, 0)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const submit = (value: string) => {
    const parsed = otpSchema.safeParse(value);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setError(undefined);

    verify.mutate(
      { email, token: parsed.data },
      {
        onSuccess: () => {
          // L'inscription commerçant a encore une étape après la connexion :
          // créer le commerce et son programme à partir du brouillon local.
          if (next === 'merchant-setup') {
            router.replace('/(auth)/signup-merchant/creating');
          } else {
            router.replace('/');
          }
        },
        onError: () =>
          setError('Code incorrect ou expiré. Vérifiez votre email ou demandez-en un nouveau.'),
      },
    );
  };

  return (
    <Screen>
      <AppBar eyebrow="Vérification" title="Entrez votre code" />

      <View style={styles.form}>
        <Text tone="secondary">
          Nous avons envoyé un code à 6 chiffres à{' '}
          <Text variant="bodyMedium">{email}</Text>.
        </Text>

        <TextField
          label="Code de vérification"
          value={code}
          onChangeText={(value) => {
            const digits = value.replace(/\D/g, '').slice(0, 6);
            setCode(digits);
            // Validation automatique au sixième chiffre : personne n'a envie
            // d'appuyer sur un bouton après avoir tapé un code.
            if (digits.length === 6) submit(digits);
          }}
          keyboardType="number-pad"
          inputMode="numeric"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={6}
          autoFocus
          placeholder="000000"
          error={error}
          containerStyle={styles.codeField}
          inputStyle={styles.codeInput}
        />

        <Button
          label="Valider"
          loadingLabel="Vérification…"
          loading={verify.isPending}
          onPress={() => submit(code)}
          disabled={code.length !== 6}
        />

        <Button
          label={
            cooldown > 0 ? `Renvoyer le code (${cooldown} s)` : 'Renvoyer le code'
          }
          variant="ghost"
          disabled={cooldown > 0 || resend.isPending}
          onPress={() =>
            resend.mutate(
              { email, createUser: false },
              {
                onSuccess: () => setCooldown(RESEND_DELAY_SECONDS),
                onError: (err) => setError(toAppError(err).message),
              },
            )
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg, marginTop: spacing.lg },
  codeField: { marginTop: spacing.sm },
  // Grand et espacé : un code se relit chiffre à chiffre, pas comme un mot.
  codeInput: { ...typography.title, letterSpacing: 8, textAlign: 'center' },
});
