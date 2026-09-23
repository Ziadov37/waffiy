import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppBar, Button, Chip, Screen, Text, TextField } from '@/components/ui';
import {
  merchantCategories,
  merchantStepSchema,
  type MerchantStepValues,
} from '@/features/auth/schemas';
import { useSession } from '@/features/auth/hooks';
import { clearFieldError, collectFieldErrors, type FieldErrors } from '@/lib/forms';
import { useMerchantSignupStore } from '@/stores/merchant-signup';
import { colors, spacing } from '@/theme';

export default function SignupMerchantCommerce() {
  const router = useRouter();
  const session = useSession();
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
      <View style={styles.content}>
        <AppBar title="" />
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>
            Étape 1 sur {session ? 2 : 3} — Mon commerce
          </Text>
          <Text style={styles.pageTitle}>Créer mon commerce</Text>
        </View>
        <View style={styles.progress}>
          <View
            style={[styles.progressFill, session ? styles.progressFillExisting : null]}
          />
        </View>

        <View style={styles.form}>
          {/* Le logo est différé après l'inscription : imposer un téléversement
            avant même d'avoir un compte allongerait le parcours sans rien
            apporter, et échouerait hors ligne. */}
          <View style={styles.logoRow}>
            <Pressable accessibilityRole="button" style={styles.logoSlot} disabled>
              <Text variant="title" tone="tertiary">
                ＋
              </Text>
            </Pressable>
            <View style={styles.logoCopy}>
              <Text style={styles.logoTitle}>Logo du commerce</Text>
              <Text style={styles.logoHint}>PNG ou JPG, 1 Mo max</Text>
            </View>
          </View>

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

          <View style={styles.row}>
            <TextField
              label="Ville"
              value={values.city}
              onChangeText={set('city')}
              autoCapitalize="words"
              error={errors.city}
              containerStyle={styles.half}
            />
            <TextField
              label="Téléphone"
              optional
              value={values.phone ?? ''}
              onChangeText={set('phone')}
              keyboardType="phone-pad"
              error={errors.phone}
              containerStyle={styles.half}
            />
          </View>

          <Button
            label="Continuer"
            onPress={submit}
            trailing={<Text style={styles.arrow}>→</Text>}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 20 },
  heading: { gap: spacing.sm },
  eyebrow: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.54,
    textTransform: 'uppercase',
    fontFamily: 'Manrope_700Bold',
  },
  pageTitle: {
    color: colors.ink,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 27,
    lineHeight: 33,
    letterSpacing: -0.68,
  },
  progress: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: { width: '33%', height: '100%', backgroundColor: colors.primary },
  progressFillExisting: { width: '50%' },
  form: { gap: 16 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logoSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 66,
    height: 66,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderInput,
    backgroundColor: colors.white,
  },
  logoCopy: { gap: 3 },
  logoTitle: {
    color: colors.ink,
    fontFamily: 'Manrope_700Bold',
    fontSize: 14.5,
    lineHeight: 20,
  },
  logoHint: {
    color: colors.textMuted,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12.5,
    lineHeight: 17,
  },
  categories: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  arrow: { color: colors.white, fontSize: 18, lineHeight: 20 },
});
