import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppBar, Button, Card, Screen, Text, TextField } from '@/components/ui';
import { useUnlockOwner } from '@/features/staff/hooks';
import { useStaffSessionStore } from '@/stores/staff-session';
import { spacing } from '@/theme';

export default function OwnerUnlock() {
  const router = useRouter();
  const staff = useStaffSessionStore((state) => state.session);
  const unlock = useUnlockOwner();
  const [password, setPassword] = useState('');

  return (
    <Screen>
      <View style={styles.content}>
        <AppBar title="Quitter le mode caisse" />
        <Card style={styles.card}>
          <Text variant="heading">Accès propriétaire</Text>
          <Text tone="secondary">
            La caisse est ouverte au nom de {staff?.staffName ?? 'ce caissier'}. Saisissez le mot
            de passe du propriétaire pour retrouver les réglages et la gestion du commerce.
          </Text>
          <TextField
            label="Mot de passe propriétaire"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            error={unlock.error ? 'Mot de passe incorrect ou connexion indisponible.' : undefined}
          />
          <Button
            label="Déverrouiller"
            loading={unlock.isPending}
            disabled={!password}
            onPress={() =>
              unlock.mutate(password, {
                onSuccess: () => router.replace('/(merchant)/(tabs)/settings'),
              })
            }
          />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 8, gap: spacing.lg },
  card: { gap: spacing.lg },
});
