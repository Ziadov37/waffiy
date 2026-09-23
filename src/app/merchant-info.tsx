import { useState } from 'react';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppBar, Button, Chip, Screen, Text, TextField } from '@/components/ui';
import { getAuthErrorMessage } from '@/features/auth/api';
import { useMyMerchant, useSession } from '@/features/auth/hooks';
import { merchantCategories, merchantStepSchema } from '@/features/auth/schemas';
import {
  useUpdateMerchantDetails,
  useUploadMerchantLogo,
} from '@/features/merchant/hooks';
import { colors, spacing } from '@/theme';

type MerchantForm = {
  name: string;
  category: (typeof merchantCategories)[number]['value'];
  city: string;
  phone: string;
};

export default function MerchantInfo() {
  const session = useSession();
  const merchant = useMyMerchant();

  if (!session) return <Redirect href="/(auth)/welcome" />;
  if (!merchant.data) {
    return (
      <Screen>
        <AppBar title="Mon commerce" closeIcon />
        <Text tone="secondary" center style={styles.loading}>
          Chargement du commerce…
        </Text>
      </Screen>
    );
  }

  return <MerchantInfoForm merchant={merchant.data} />;
}

function MerchantInfoForm({
  merchant,
}: {
  merchant: NonNullable<ReturnType<typeof useMyMerchant>['data']>;
}) {
  const router = useRouter();
  const update = useUpdateMerchantDetails();
  const uploadLogo = useUploadMerchantLogo();
  const [values, setValues] = useState<MerchantForm>({
    name: merchant.name,
    category: merchant.category,
    city: merchant.city,
    phone: merchant.phone ?? '',
  });
  const [error, setError] = useState<string>();

  const chooseLogo = async () => {
    setError(undefined);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.82,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    if (asset.fileSize && asset.fileSize > 1024 * 1024) {
      setError('Le logo doit peser au maximum 1 Mo.');
      return;
    }
    uploadLogo.mutate(
      { uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' },
      { onError: (cause) => setError(getAuthErrorMessage(cause)) },
    );
  };

  const save = () => {
    const parsed = merchantStepSchema.safeParse({ ...values, logoUrl: undefined });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setError(undefined);
    update.mutate(
      {
        name: parsed.data.name,
        category: parsed.data.category,
        city: parsed.data.city,
        phone: parsed.data.phone || null,
      },
      {
        onSuccess: () => router.back(),
        onError: (cause) => setError(getAuthErrorMessage(cause)),
      },
    );
  };

  return (
    <Screen>
      <AppBar eyebrow="Réglages" title="Mon commerce" closeIcon />
      <View style={styles.form}>
        <View style={styles.logoRow}>
          {merchant.logo_url ? (
            <Image
              source={{ uri: merchant.logo_url }}
              style={styles.logo}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.logo, styles.logoFallback]}>
              <Text style={styles.logoLetter}>
                {merchant.name.slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.logoActions}>
            <Text variant="subheading">Logo du commerce</Text>
            <Text variant="caption" tone="secondary">
              PNG, JPG ou WebP carré · 1 Mo max
            </Text>
            <Button
              label={merchant.logo_url ? 'Changer le logo' : 'Ajouter un logo'}
              variant="secondary"
              size="md"
              loading={uploadLogo.isPending}
              loadingLabel="Envoi…"
              onPress={() => void chooseLogo()}
            />
          </View>
        </View>

        <TextField
          label="Nom du commerce"
          value={values.name}
          onChangeText={(name) => setValues((current) => ({ ...current, name }))}
        />
        <View style={styles.categories}>
          <Text variant="label" tone="secondary">
            Catégorie
          </Text>
          <View style={styles.chips}>
            {merchantCategories.map((category) => (
              <Chip
                key={category.value}
                label={category.label}
                active={values.category === category.value}
                onPress={() =>
                  setValues((current) => ({ ...current, category: category.value }))
                }
              />
            ))}
          </View>
        </View>
        <TextField
          label="Ville"
          value={values.city}
          onChangeText={(city) => setValues((current) => ({ ...current, city }))}
        />
        <TextField
          label="Téléphone"
          optional
          keyboardType="phone-pad"
          value={values.phone}
          onChangeText={(phone) => setValues((current) => ({ ...current, phone }))}
        />
        {error ? (
          <Text variant="caption" tone="danger">
            {error}
          </Text>
        ) : null}
        <Button
          label="Enregistrer"
          loading={update.isPending}
          loadingLabel="Enregistrement…"
          onPress={save}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: spacing.xxl },
  form: { marginTop: spacing.lg, gap: spacing.lg },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  logo: { width: 84, height: 84, borderRadius: 22 },
  logoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  logoLetter: { color: colors.white, fontSize: 38, fontWeight: '900' },
  logoActions: { flex: 1, gap: spacing.sm },
  categories: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
