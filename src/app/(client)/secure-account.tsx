import { useEffect, useRef, useState } from 'react';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppBar, Button, Card, Screen, Text, TextField } from '@/components/ui';
import {
  useFinishGuestAccountUpgrade,
  useConfirmGuestAccountLink,
  useIsAnonymous,
  useProfile,
  useResendGuestAccountCode,
  useStartGuestAccountUpgrade,
  useVerifyGuestAccountEmail,
} from '@/features/auth/hooks';
import {
  otpSchema,
  secureAccountDetailsSchema,
  secureAccountPasswordSchema,
  type SecureAccountDetailsValues,
  type SecureAccountPasswordValues,
} from '@/features/auth/schemas';
import { getAuthErrorMessage } from '@/features/auth/api';
import { clearFieldError, collectFieldErrors, type FieldErrors } from '@/lib/forms';
import { colors, spacing, typography } from '@/theme';

type Step = 'details' | 'code' | 'password';

/** Convertit la session invitée en compte récupérable sans changer son user id. */
export default function SecureAccount() {
  const router = useRouter();
  const params = useLocalSearchParams<{ emailConfirmed?: string | string[] }>();
  const emailConfirmed = Array.isArray(params.emailConfirmed)
    ? params.emailConfirmed[0] === '1'
    : params.emailConfirmed === '1';
  const anonymous = useIsAnonymous();
  const linkCheckStarted = useRef(false);
  const { data: profile } = useProfile();
  const [step, setStep] = useState<Step>('details');
  const [details, setDetails] = useState<SecureAccountDetailsValues>({
    firstName: profile?.first_name ?? '',
    lastName: profile?.last_name ?? '',
    email: '',
  });
  const [detailErrors, setDetailErrors] = useState<
    FieldErrors<SecureAccountDetailsValues>
  >({});
  const [code, setCode] = useState('');
  const [passwords, setPasswords] = useState<SecureAccountPasswordValues>({
    password: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<
    FieldErrors<SecureAccountPasswordValues>
  >({});
  const [formError, setFormError] = useState<string>();
  const start = useStartGuestAccountUpgrade();
  const verify = useVerifyGuestAccountEmail();
  const resend = useResendGuestAccountCode();
  const confirmLink = useConfirmGuestAccountLink();
  const finish = useFinishGuestAccountUpgrade();

  useEffect(() => {
    if (!emailConfirmed || step !== 'details' || linkCheckStarted.current) return;

    linkCheckStarted.current = true;
    confirmLink.mutate(undefined, {
      onSuccess: () => setStep('password'),
      onError: () =>
        setFormError(
          'La confirmation n’est pas encore visible. Ouvrez de nouveau le lien reçu par email.',
        ),
    });
  }, [confirmLink, emailConfirmed, step]);

  if (!anonymous && step === 'details' && !emailConfirmed) {
    return <Redirect href="/(client)/(tabs)/profile" />;
  }

  const setDetail = (key: keyof SecureAccountDetailsValues) => (value: string) => {
    setDetails((current) => ({ ...current, [key]: value }));
    setDetailErrors((current) => clearFieldError(current, key));
    setFormError(undefined);
  };

  const submitDetails = () => {
    const parsed = secureAccountDetailsSchema.safeParse(details);
    if (!parsed.success) {
      setDetailErrors(collectFieldErrors<SecureAccountDetailsValues>(parsed.error));
      return;
    }
    setFormError(undefined);
    start.mutate(parsed.data, {
      onSuccess: () => setStep('code'),
      onError: (error) => setFormError(getAuthErrorMessage(error)),
    });
  };

  const submitCode = () => {
    const parsed = otpSchema.safeParse(code);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message);
      return;
    }
    setFormError(undefined);
    verify.mutate(
      { email: details.email, token: parsed.data },
      {
        onSuccess: () => setStep('password'),
        onError: () => setFormError('Code incorrect ou expiré. Vérifiez votre email.'),
      },
    );
  };

  const setPassword = (key: keyof SecureAccountPasswordValues) => (value: string) => {
    setPasswords((current) => ({ ...current, [key]: value }));
    setPasswordErrors((current) => clearFieldError(current, key));
    setFormError(undefined);
  };

  const submitPassword = () => {
    const parsed = secureAccountPasswordSchema.safeParse(passwords);
    if (!parsed.success) {
      setPasswordErrors(collectFieldErrors<SecureAccountPasswordValues>(parsed.error));
      return;
    }
    setFormError(undefined);
    finish.mutate(parsed.data.password, {
      onSuccess: () => router.replace('/(client)/(tabs)/profile'),
      onError: (error) => setFormError(getAuthErrorMessage(error)),
    });
  };

  return (
    <Screen>
      <AppBar eyebrow="Protection du compte" title="Sécuriser mes cartes" closeIcon />

      <Card
        surface={colors.primarySurface}
        border={colors.primaryBorder}
        style={styles.explanation}
      >
        <Text variant="subheading">Vos points ne bougeront pas</Text>
        <Text tone="secondary">
          Votre compte actuel recevra un email vérifié et un mot de passe. Vous pourrez
          ainsi retrouver vos cartes après un changement de téléphone.
        </Text>
      </Card>

      {step === 'details' ? (
        <View style={styles.form}>
          {emailConfirmed ? (
            <>
              <Text variant="heading">Confirmation en cours…</Text>
              <Text tone="secondary">
                Waffiy vérifie votre email avant de vous laisser choisir un mot de passe.
              </Text>
            </>
          ) : (
            <>
              <Text variant="heading">1. Vos informations</Text>
              <View style={styles.nameRow}>
                <TextField
                  label="Prénom"
                  value={details.firstName}
                  onChangeText={setDetail('firstName')}
                  autoComplete="given-name"
                  error={detailErrors.firstName}
                  containerStyle={styles.nameField}
                />
                <TextField
                  label="Nom"
                  value={details.lastName}
                  onChangeText={setDetail('lastName')}
                  autoComplete="family-name"
                  error={detailErrors.lastName}
                  containerStyle={styles.nameField}
                />
              </View>
              <TextField
                label="Email"
                value={details.email}
                onChangeText={setDetail('email')}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                error={detailErrors.email}
              />
              <Text variant="caption" tone="secondary">
                Aucun numéro de téléphone n’est nécessaire.
              </Text>
              <Button
                label="Recevoir l’email de vérification"
                loadingLabel="Envoi de l’email…"
                loading={start.isPending}
                onPress={submitDetails}
              />
            </>
          )}
        </View>
      ) : null}

      {step === 'code' ? (
        <View style={styles.form}>
          <Text variant="heading">2. Vérifiez votre email</Text>
          <Text tone="secondary">
            Ouvrez l’email envoyé à {details.email.trim().toLowerCase()} et appuyez sur «
            Confirm new email address ». Waffiy rouvrira cet écran automatiquement.
          </Text>
          <Button
            label="J’ai confirmé via le lien"
            loadingLabel="Vérification…"
            loading={confirmLink.isPending}
            onPress={() =>
              confirmLink.mutate(undefined, {
                onSuccess: () => setStep('password'),
                onError: () =>
                  setFormError(
                    'Email non confirmé. Ouvrez d’abord le lien reçu, puis réessayez.',
                  ),
              })
            }
          />
          <Text variant="caption" tone="secondary" center>
            Si votre email affiche plutôt un code à 6 chiffres, saisissez-le ci-dessous.
          </Text>
          <TextField
            label="Code de vérification"
            value={code}
            onChangeText={(value) => {
              setCode(value.replace(/\D/g, '').slice(0, 6));
              setFormError(undefined);
            }}
            keyboardType="number-pad"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            inputStyle={styles.codeInput}
          />
          <Button
            label="Vérifier le code"
            loadingLabel="Vérification…"
            loading={verify.isPending}
            disabled={code.length !== 6}
            onPress={submitCode}
          />
          <Button
            label="Renvoyer l’email"
            variant="ghost"
            loading={resend.isPending}
            onPress={() =>
              resend.mutate(details.email, {
                onError: (error) => setFormError(getAuthErrorMessage(error)),
              })
            }
          />
        </View>
      ) : null}

      {step === 'password' ? (
        <View style={styles.form}>
          <Text variant="heading">3. Choisissez un mot de passe</Text>
          <TextField
            label="Mot de passe"
            value={passwords.password}
            onChangeText={setPassword('password')}
            secureTextEntry
            autoComplete="new-password"
            error={passwordErrors.password}
          />
          <TextField
            label="Confirmer le mot de passe"
            value={passwords.confirmPassword}
            onChangeText={setPassword('confirmPassword')}
            secureTextEntry
            autoComplete="new-password"
            error={passwordErrors.confirmPassword}
          />
          <Button
            label="Sécuriser mes cartes"
            loadingLabel="Sécurisation…"
            loading={finish.isPending}
            onPress={submitPassword}
          />
        </View>
      ) : null}

      {formError ? (
        <Text variant="caption" tone="danger" center>
          {formError}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  explanation: { marginTop: spacing.lg, gap: spacing.sm },
  form: { marginTop: spacing.xxl, gap: spacing.lg },
  nameRow: { flexDirection: 'row', gap: spacing.md },
  nameField: { flex: 1 },
  codeInput: { ...typography.title, textAlign: 'center', letterSpacing: 8 },
});
