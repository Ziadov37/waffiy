import { useState } from 'react';
import { Redirect, type Href, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppBar, Button, Card, Screen, Text, TextField } from '@/components/ui';
import { getAuthErrorMessage, type Profile } from '@/features/auth/api';
import { useProfile, useSession, useUpdateProfile } from '@/features/auth/hooks';
import { profileDetailsSchema, type ProfileDetailsValues } from '@/features/auth/schemas';
import { clearFieldError, collectFieldErrors, type FieldErrors } from '@/lib/forms';
import { colors, spacing } from '@/theme';

export default function AccountInfo() {
  const session = useSession();
  const profile = useProfile();

  if (!session) return <Redirect href="/(auth)/welcome" />;
  if (!profile.data) {
    return (
      <Screen>
        <AppBar title="Mes informations" closeIcon />
        <Text tone="secondary" center style={styles.loading}>
          Chargement de vos informations…
        </Text>
      </Screen>
    );
  }

  return <AccountInfoForm profile={profile.data} />;
}

function AccountInfoForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [values, setValues] = useState<ProfileDetailsValues>({
    firstName: profile.first_name,
    lastName: profile.last_name,
  });
  const [errors, setErrors] = useState<FieldErrors<ProfileDetailsValues>>({});
  const [formError, setFormError] = useState<string>();
  const update = useUpdateProfile();

  const set = (key: keyof ProfileDetailsValues) => (value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => clearFieldError(current, key));
    setFormError(undefined);
  };

  const submit = () => {
    const parsed = profileDetailsSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(collectFieldErrors<ProfileDetailsValues>(parsed.error));
      return;
    }
    update.mutate(
      { first_name: parsed.data.firstName, last_name: parsed.data.lastName },
      {
        onSuccess: () => router.back(),
        onError: (cause) => setFormError(getAuthErrorMessage(cause)),
      },
    );
  };

  return (
    <Screen>
      <AppBar eyebrow="Compte" title="Mes informations" closeIcon />
      <View style={styles.form}>
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
        <TextField label="Email vérifié" value={profile.email ?? ''} editable={false} />
        <Card
          surface={colors.primarySurface}
          border={colors.primaryBorder}
          style={styles.phoneCard}
        >
          <Text variant="subheading">
            {profile.phone_verified_at ? 'Téléphone vérifié' : 'Téléphone non vérifié'}
          </Text>
          <Text tone="secondary">{profile.phone ?? 'Aucun numéro renseigné'}</Text>
          <Button
            label={
              profile.phone_verified_at ? 'Changer de numéro' : 'Vérifier mon numéro'
            }
            variant="secondary"
            size="md"
            onPress={() => router.push('/verify-phone' as Href)}
          />
        </Card>
        {formError ? (
          <Text variant="caption" tone="danger">
            {formError}
          </Text>
        ) : null}
        <Button
          label="Enregistrer"
          loadingLabel="Enregistrement…"
          loading={update.isPending}
          onPress={submit}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: spacing.xxl },
  form: { marginTop: spacing.lg, gap: spacing.lg },
  phoneCard: { gap: spacing.sm },
});
