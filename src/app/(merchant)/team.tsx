import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { AppBar, Button, Card, Screen, Text, TextField } from '@/components/ui';
import {
  useChangeMerchantStaffPin,
  useCreateMerchantStaff,
  useMerchantStaff,
  useOpenMerchantStaffSession,
  useSetMerchantStaffActive,
} from '@/features/staff/hooks';
import { colors, spacing } from '@/theme';

function staffError(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('INVALID_STAFF_PIN')) return 'Le PIN doit contenir 4 à 6 chiffres.';
  if (message.includes('STAFF_PIN_ALREADY_USED')) return 'Ce PIN est déjà utilisé par un caissier.';
  if (message.includes('INVALID_STAFF_NAME')) return 'Saisissez un nom de 2 à 80 caractères.';
  if (message.includes('STAFF_LIMIT_REACHED')) return 'La limite de caissiers actifs est atteinte.';
  return 'Impossible de terminer cette action. Réessayez.';
}

export default function MerchantTeam() {
  const router = useRouter();
  const staff = useMerchantStaff();
  const create = useCreateMerchantStaff();
  const toggle = useSetMerchantStaffActive();
  const changePin = useChangeMerchantStaffPin();
  const openSession = useOpenMerchantStaffSession();
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [sessionPin, setSessionPin] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPin, setNewPin] = useState('');

  const createStaff = () => {
    create.mutate(
      { name, pin },
      {
        onSuccess: () => {
          setName('');
          setPin('');
        },
      },
    );
  };

  const startCashierMode = () => {
    openSession.mutate(sessionPin, {
      onSuccess: () => {
        setSessionPin('');
        router.replace('/(merchant)/(tabs)');
      },
    });
  };

  return (
    <Screen onRefresh={() => void staff.refetch()} refreshing={staff.isRefetching}>
      <View style={styles.content}>
        <AppBar title="Équipe" />

        <Card style={styles.section} surface="#F2F8F5" border="#CDE8D8">
          <Text variant="heading">Ouvrir une session caisse</Text>
          <Text tone="secondary">
            Le caissier saisit son PIN. Il pourra scanner, créditer et valider une récompense,
            sans accéder aux réglages.
          </Text>
          <TextField
            label="PIN du caissier"
            value={sessionPin}
            onChangeText={(value) => setSessionPin(value.replace(/\D/g, ''))}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
            placeholder="4 à 6 chiffres"
            error={openSession.error ? staffError(openSession.error) : undefined}
          />
          <Button
            label="Passer en mode caisse"
            loading={openSession.isPending}
            disabled={!/^\d{4,6}$/.test(sessionPin)}
            onPress={startCashierMode}
          />
        </Card>

        <View style={styles.headingRow}>
          <Text variant="heading">Membres</Text>
          <Text tone="secondary">{staff.data?.filter((item) => item.active).length ?? 0} actif(s)</Text>
        </View>

        {staff.isPending ? (
          <Card><Text tone="secondary">Chargement de l’équipe…</Text></Card>
        ) : staff.error ? (
          <Card style={styles.section}>
            <Text variant="heading">Équipe indisponible</Text>
            <Button label="Réessayer" onPress={() => void staff.refetch()} />
          </Card>
        ) : staff.data?.length ? (
          <View style={styles.list}>
            {staff.data.map((member) => (
              <Card key={member.id} style={styles.member}>
                <View style={styles.memberHeader}>
                  <View style={styles.memberCopy}>
                    <Text variant="bodyMedium">{member.name}</Text>
                    <Text variant="caption" tone={member.active ? 'primary' : 'tertiary'}>
                      {member.active ? 'Accès actif' : 'Accès révoqué'}
                    </Text>
                  </View>
                  <Button
                    label={member.active ? 'Révoquer' : 'Réactiver'}
                    variant={member.active ? 'danger' : 'secondary'}
                    size="md"
                    fullWidth={false}
                    loading={toggle.isPending && toggle.variables?.staffId === member.id}
                    onPress={() => {
                      const run = () => toggle.mutate({ staffId: member.id, active: !member.active });
                      if (!member.active) return run();
                      Alert.alert(
                        'Révoquer cet accès ?',
                        `Les sessions de ${member.name} seront coupées immédiatement.`,
                        [
                          { text: 'Annuler', style: 'cancel' },
                          { text: 'Révoquer', style: 'destructive', onPress: run },
                        ],
                      );
                    }}
                  />
                </View>

                {member.active ? (
                  editingId === member.id ? (
                    <View style={styles.pinEditor}>
                      <TextField
                        label="Nouveau PIN"
                        value={newPin}
                        onChangeText={(value) => setNewPin(value.replace(/\D/g, ''))}
                        keyboardType="number-pad"
                        secureTextEntry
                        maxLength={6}
                      />
                      <View style={styles.inlineActions}>
                        <Button
                          label="Annuler"
                          variant="ghost"
                          size="md"
                          fullWidth={false}
                          onPress={() => {
                            setEditingId(null);
                            setNewPin('');
                          }}
                        />
                        <Button
                          label="Enregistrer"
                          size="md"
                          fullWidth={false}
                          loading={changePin.isPending}
                          disabled={!/^\d{4,6}$/.test(newPin)}
                          onPress={() =>
                            changePin.mutate(
                              { staffId: member.id, pin: newPin },
                              {
                                onSuccess: () => {
                                  setEditingId(null);
                                  setNewPin('');
                                },
                              },
                            )
                          }
                        />
                      </View>
                      {changePin.error ? (
                        <Text variant="caption" tone="danger">{staffError(changePin.error)}</Text>
                      ) : null}
                    </View>
                  ) : (
                    <Text
                      variant="label"
                      tone="primary"
                      onPress={() => setEditingId(member.id)}
                    >
                      Changer le PIN
                    </Text>
                  )
                ) : null}
              </Card>
            ))}
          </View>
        ) : (
          <Card><Text tone="secondary">Aucun caissier pour le moment.</Text></Card>
        )}

        <Card style={styles.section}>
          <Text variant="heading">Ajouter un caissier</Text>
          <TextField
            label="Nom affiché"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            placeholder="Ex. Nadia"
          />
          <TextField
            label="PIN personnel"
            value={pin}
            onChangeText={(value) => setPin(value.replace(/\D/g, ''))}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
            placeholder="4 à 6 chiffres"
            hint="Choisissez un PIN différent pour chaque caissier."
            error={create.error ? staffError(create.error) : undefined}
          />
          <Button
            label="Ajouter le caissier"
            loading={create.isPending}
            disabled={name.trim().length < 2 || !/^\d{4,6}$/.test(pin)}
            onPress={createStaff}
          />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 8, gap: spacing.lg },
  section: { gap: spacing.md },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  list: { gap: spacing.md },
  member: { gap: spacing.md },
  memberHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  memberCopy: { flex: 1, gap: 3 },
  pinEditor: { gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  inlineActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
});
