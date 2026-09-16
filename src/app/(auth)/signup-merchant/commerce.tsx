import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppBar, Button, Chip, Screen, Text, TextField } from '@/components/ui';
import {
  merchantCategories,
  merchantStepSchema,
  type MerchantStepValues,
} from '@/features/auth/schemas';
import { clearFieldError, collectFieldErrors, type FieldErrors } from '@/lib/forms';
import { useMerchantSignupStore } from '@/stores/merchant-signup';
import { colors, radius, spacing } from '@/theme';

export default function SignupMerchantCommerce() {
  const router = useRouter();
  const saved = useMerchantSignupStore((s) => s.commerce);
  const setCommerce = useMerchantSignupStore((s) => s.setCommerce);

  const [values, setValues] = useState<MerchantStepValues>(
    saved ?? { name: '', category: 'restaurant', city: '', phone: '' },
  );
  const [errors, setErrors] = useState<FieldErrors<MerchantStepValues>>({});

  const set =
    <K extends keyof MerchantStepValues>(key: K) =>
    (value: MerchantStepValues[K]) => {
      setValues((v) => ({ ...v, [key]: value }));
      setErrors((e) => clearFieldError(e, key));
    };

  const submit = () => {
    const parsed = merchantStepSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(collectFieldErrors<MerchantStepValues>(parsed.error));
      return;
    }
    setCommerce(parsed.data);
    router.push('/(auth)/signup-merchant/programme');
  };

  return (
    <Screen>
      <AppBar eyebrow="Étape 1 sur 3 — Mon commerce" title="Créer mon commerce" />

      <View style={styles.form}>
        {/* Le logo est différé après l'inscription : imposer un téléversement
            avant même d'avoir un compte allongerait le parcours sans rien
            apporter, et échouerait hors ligne. */}
        <Pressable accessibilityRole="button" style={styles.logoSlot} disabled>
          <Text variant="title" tone="tertiary">
            ＋
          </Text>
          <Text variant="caption" tone="tertiary" center>
            Logo du commerce{'\n'}à ajouter depuis les réglages
          </Text>
        </Pressable>

        <TextField
          label="Nom du commerce"
          value={values.name}
          onChangeText={set('name')}
          autoCapitalize="words"
          error={errors.name}
        />

        <View style={styles.categories}>
          <Text variant="label" tone="secondary">
            Catégorie
          </Text>
          <View style={styles.chips}>
            {merchantCategories.map((c) => (
              <Chip
                key={c.value}
                label={c.label}
                active={values.category === c.value}
                onPress={() => set('category')(c.value)}
              />
            ))}
          </View>
        </View>

        <TextField
          label="Ville"
          value={values.city}
          onChangeText={set('city')}
          autoCapitalize="words"
          error={errors.city}
        />
        <TextField
          label="Téléphone"
          optional
          value={values.phone ?? ''}
          onChangeText={set('phone')}
          keyboardType="phone-pad"
          error={errors.phone}
        />

        <Button label="Continuer" onPress={submit} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg, marginTop: spacing.md },
  logoSlot: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    width: 160,
    paddingVertical: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderInput,
    backgroundColor: colors.white,
  },
  categories: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
