import { useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, Screen, Text } from '@/components/ui';
import { createMerchant } from '@/features/auth/merchant';
import { toAppError } from '@/lib/errors';
import { useMerchantSignupStore } from '@/stores/merchant-signup';
import { useSessionStore } from '@/stores/session';
import { colors, spacing } from '@/theme';

/**
 * Dernière étape de l'inscription commerçant, après vérification de l'email.
 *
 * Écran à part plutôt qu'un appel enfoui dans l'écran de code : la création
 * peut échouer — réseau, commerce déjà existant — et il faut alors un endroit
 * où l'expliquer et proposer un nouvel essai, sans avoir à refaire les trois
 * étapes précédentes. Le brouillon local est toujours là.
 */
export default function SignupMerchantCreating() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const commerce = useMerchantSignupStore((s) => s.commerce);
  const program = useMerchantSignupStore((s) => s.program);
  const clearDraft = useMerchantSignupStore((s) => s.clear);
  const setActiveRole = useSessionStore((s) => s.setActiveRole);
  const started = useRef(false);

  const mutation = useMutation({
    mutationFn: createMerchant,
    onSuccess: async () => {
      clearDraft();
      setActiveRole('merchant');
      await queryClient.invalidateQueries();
      router.replace('/(merchant)/(tabs)');
    },
  });

  const { mutate } = mutation;

  useEffect(() => {
    if (started.current || !commerce || !program) return;
    started.current = true;
    mutate({ commerce, program });
  }, [commerce, program, mutate]);

  // Brouillon perdu — application réinstallée entre-temps, par exemple.
  if (!commerce || !program) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text variant="heading" center>
            Informations manquantes
          </Text>
          <Text tone="secondary" center>
            Les informations de votre commerce n’ont pas été retrouvées. Reprenez la
            création, votre compte est déjà actif.
          </Text>
          <Button
            label="Reprendre"
            onPress={() => router.replace('/(auth)/signup-merchant/commerce')}
          />
        </View>
      </Screen>
    );
  }

  if (mutation.isError) {
    const error = toAppError(mutation.error);
    return (
      <Screen>
        <View style={styles.center}>
          <Text variant="heading" center>
            {error.title}
          </Text>
          <Text tone="secondary" center>
            {error.message}
          </Text>
          <Button
            label="Réessayer"
            onPress={() => mutate({ commerce, program })}
            loading={mutation.isPending}
          />
          <Button
            label="Continuer sans commerce"
            variant="ghost"
            onPress={() => router.replace('/(client)/(tabs)')}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text variant="heading" center>
          Création de votre commerce…
        </Text>
        <Text tone="secondary" center>
          {commerce.name} — {program.threshold} visites = {program.name}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
});
