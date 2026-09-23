import { useState } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppBar, Button, Card, Screen, Text, TextField } from '@/components/ui';
import { getAuthErrorMessage } from '@/features/auth/api';
import {
  useProfile,
  useRequestPhoneVerification,
  useResendPhoneCode,
  useSession,
  useVerifyPhoneCode,
} from '@/features/auth/hooks';
import { otpSchema, phoneSchema } from '@/features/auth/schemas';
import { colors, spacing, typography } from '@/theme';

type Step = 'phone' | 'code';

export default function VerifyPhone() {
  const router = useRouter();
  const session = useSession();
  const { data: profile } = useProfile();
  const [step, setStep] = useState<Step>('phone');
  const [phoneValue, setPhone] = useState<string>();
  const phone = phoneValue ?? profile?.phone ?? '';
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const request = useRequestPhoneVerification();
  const verify = useVerifyPhoneCode();
  const resend = useResendPhoneCode();

  if (!session) return <Redirect href="/(auth)/welcome" />;

  const sendCode = () => {
    const parsed = phoneSchema.safeParse(phone);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setPhone(parsed.data);
    setError(undefined);
    request.mutate(parsed.data, {
      onSuccess: () => setStep('code'),
      onError: (cause) => setError(getAuthErrorMessage(cause)),
    });
  };

  const confirmCode = () => {
    const parsedCode = otpSchema.safeParse(code);
    if (!parsedCode.success) {
      setError(parsedCode.error.issues[0]?.message);
      return;
    }
    setError(undefined);
    verify.mutate(
      { phone, token: parsedCode.data },
      {
        onSuccess: () => router.back(),
        onError: () => setError('Code incorrect ou expiré. Réessayez.'),
      },
    );
  };

  return (
    <Screen>
      <AppBar eyebrow="Sécurité du compte" title="Vérifier mon téléphone" closeIcon />

      <Card
        surface={colors.primarySurface}
        border={colors.primaryBorder}
        style={styles.note}
      >
        <Text variant="subheading">Un numéro, un seul compte</Text>
        <Text tone="secondary">
          Les formats 05…, 06…, 07… et +213… sont reconnus comme le même numéro. Il ne
          pourra servir à la connexion qu’après validation du code SMS.
        </Text>
      </Card>

      {profile?.phone_verified_at && step === 'phone' ? (
        <Text variant="caption" tone="primary" center>
          Numéro actuellement vérifié : {profile.phone}
        </Text>
      ) : null}

      {step === 'phone' ? (
        <View style={styles.form}>
          <TextField
            label="Mobile algérien"
            value={phone}
            onChangeText={(value) => {
              setPhone(value);
              setError(undefined);
            }}
            autoComplete="tel"
            keyboardType="phone-pad"
            placeholder="05 55 12 34 56"
          />
          <Button
            label="Recevoir le code par SMS"
            loadingLabel="Envoi du code…"
            loading={request.isPending}
            onPress={sendCode}
          />
        </View>
      ) : (
        <View style={styles.form}>
          <Text variant="heading">Saisissez le code reçu</Text>
          <Text tone="secondary">Le code a été envoyé au {phone}.</Text>
          <TextField
            label="Code à 6 chiffres"
            value={code}
            onChangeText={(value) => {
              setCode(value.replace(/\D/g, '').slice(0, 6));
              setError(undefined);
            }}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            maxLength={6}
            inputStyle={styles.codeInput}
          />
          <Button
            label="Vérifier mon numéro"
            loadingLabel="Vérification…"
            loading={verify.isPending}
            disabled={code.length !== 6}
            onPress={confirmCode}
          />
          <Button
            label="Renvoyer le code"
            variant="ghost"
            loading={resend.isPending}
            onPress={() =>
              resend.mutate(phone, {
                onError: (cause) => setError(getAuthErrorMessage(cause)),
              })
            }
          />
        </View>
      )}

      {error ? (
        <Text variant="caption" tone="danger" center>
          {error}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { marginTop: spacing.lg, gap: spacing.sm },
  form: { marginTop: spacing.xxl, gap: spacing.lg },
  codeInput: { ...typography.title, textAlign: 'center', letterSpacing: 8 },
});
