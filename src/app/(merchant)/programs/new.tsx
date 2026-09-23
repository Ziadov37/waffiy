import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ProgramForm, type ProgramFormValues } from '@/components/merchant';
import { AppBar, Card, Screen, Text } from '@/components/ui';
import { useCreateProgram } from '@/features/merchant/hooks';
import { toAppError } from '@/lib/errors';
import { defaultTint, spacing } from '@/theme';

const INITIAL: ProgramFormValues = {
  program: {
    name: '',
    emoji: '🎁',
    description: '',
    threshold: 10,
    surfaceColor: defaultTint.surface,
    borderColor: defaultTint.border,
  },
  status: 'active',
};

export default function NewProgram() {
  const router = useRouter();
  const create = useCreateProgram();
  const [error, setError] = useState<string>();

  const submit = (values: ProgramFormValues) => {
    setError(undefined);
    create.mutate(values, {
      onSuccess: () => router.replace('/(merchant)/programs'),
      onError: (cause) => setError(toAppError(cause).message),
    });
  };

  return (
    <Screen>
      <AppBar eyebrow="Programme" title="Créer un programme" />
      <ProgramForm
        initial={INITIAL}
        submitLabel="Créer le programme"
        loading={create.isPending}
        onSubmit={submit}
      >
        {error ? (
          <Card style={styles.error}>
            <Text tone="danger">{error}</Text>
          </Card>
        ) : null}
      </ProgramForm>
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { marginBottom: spacing.xs },
});
