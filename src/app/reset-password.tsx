import { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppBar, Button, Card, Screen, Text, TextField } from '@/components/ui';
import { getAuthErrorMessage, restoreRecoverySession } from '@/features/auth/api';
import { useUpdatePassword } from '@/features/auth/hooks';
import {
  secureAccountPasswordSchema,
  type SecureAccountPasswordValues,
} from '@/features/auth/schemas';
import { clearFieldError, collectFieldErrors, type FieldErrors } from '@/lib/forms';
import { colors, spacing } from '@/theme';

type LinkStatus = 'loading' | 'ready' | 'invalid';

export default function ResetPassword() {
  const router = useRouter();
  const url = Linking.useURL();
  const [status, setStatus] = useState<LinkStatus>('loading');
  const [values, setValues] = useState<SecureAccountPasswordValues>({
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FieldErrors<SecureAccountPasswordValues>>({});
  const [formError, setFormError] = useState<string>();
  const update = useUpdatePassword();

  useEffect(() => {
    if (!url) return;
    void restoreRecoverySession(url).then(
      () => setStatus('ready'),
      () => setStatus('invalid'),
    );
  }, [url]);

  const set = (key: keyof SecureAccountPasswordValues) => (value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => clearFieldError(current, key));
    setFormError(undefined);
  };

  const submit = () => {
    const parsed = secureAccountPasswordSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(collectFieldErrors<SecureAccountPasswordValues>(parsed.error));
      return;
    }
    setFormError(undefined);
    update.mutate(parsed.data.password, {
      onSuccess: () => router.replace('/'),
      onError: (cause) => setFormError(getAuthErrorMessage(cause)),
    });
  };

  return (
    <Screen>
      <AppBar eyebrow="Récupération" title="Nouveau mot de passe" />

      {status === 'loading' ? (
        <Text tone="secondary" center style={styles.message}>
          Vérification du lien sécurisé…
        </Text>
      ) : null}

      {status === 'invalid' ? (
        <Card surface={colors.dangerSurface} border={colors.danger} style={styles.card}>
          <Text variant="heading">Lien invalide ou expiré</Text>
          <Text tone="secondary">
            Demandez un nouveau lien depuis l’écran de connexion.
          </Text>
          <Button
            label="Demander un nouveau lien"
            onPress={() => router.replace('/(auth)/forgot-password')}
          />
        </Card>
      ) : null}

      {status === 'ready' ? (
        <View style={styles.form}>
          <TextField
            label="Nouveau mot de passe"
            value={values.password}
            onChangeText={set('password')}
            secureTextEntry
            autoComplete="new-password"
            error={errors.password}
          />
          <TextField
            label="Confirmer le mot de passe"
            value={values.confirmPassword}
            onChangeText={set('confirmPassword')}
            secureTextEntry
            autoComplete="new-password"
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
            label="Enregistrer le nouveau mot de passe"
            loadingLabel="Enregistrement…"
            loading={update.isPending}
            onPress={submit}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  message: { marginTop: spacing.xxl },
  form: { marginTop: spacing.xl, gap: spacing.lg },
  card: { marginTop: spacing.xl, gap: spacing.lg },
});
