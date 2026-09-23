import { type Href, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Screen, Text } from '@/components/ui';
import { useMyMerchant, useProfile, useSignOut } from '@/features/auth/hooks';
import { merchantCategories } from '@/features/auth/schemas';
import { usePrograms } from '@/features/merchant/hooks';
import { useMerchantStaff } from '@/features/staff/hooks';
import { useSessionStore } from '@/stores/session';
import { colors, fontFamily } from '@/theme';

export default function MerchantSettings() {
  const router = useRouter();
  const { data: merchant } = useMyMerchant();
  const { data: profile } = useProfile();
  const programs = usePrograms();
  const staff = useMerchantStaff();
  const signOut = useSignOut();
  const setActiveRole = useSessionStore((state) => state.setActiveRole);
  const category = merchantCategories.find(
    (item) => item.value === merchant?.category,
  )?.label;

  return (
    <Screen>
      <View style={styles.content}>
        <Text variant="title">Réglages</Text>

        <View style={styles.merchant}>
          {merchant?.logo_url ? (
            <Image
              source={{ uri: merchant.logo_url }}
              style={styles.logo}
              contentFit="cover"
            />
          ) : (
            <View style={styles.logo}>
              <Text style={styles.logoEmoji}>
                {merchant?.name.slice(0, 1).toUpperCase() ?? 'W'}
              </Text>
            </View>
          )}
          <View style={styles.merchantCopy}>
            <Text style={styles.merchantName}>{merchant?.name ?? 'Votre commerce'}</Text>
            <Text style={styles.merchantMeta}>
              {[category, merchant?.city].filter(Boolean).join(' — ')}
            </Text>
          </View>
        </View>

        <Button
          label="Passer en mode client"
          variant="secondary"
          size="md"
          onPress={() => {
            setActiveRole('client');
            router.replace('/(client)/(tabs)');
          }}
        />

        <View style={styles.menu}>
          <SettingsRow
            label="Mes informations"
            onPress={() => router.push('/account-info' as Href)}
          />
          <SettingsRow
            label="Mon commerce"
            onPress={() => router.push('/merchant-info' as Href)}
          />
          <SettingsRow
            label={`Programmes de fidélité — ${programs.data?.length ?? 0}`}
            onPress={() => router.push('/(merchant)/programs')}
          />
          <SettingsRow
            label="QR d'inscription clients"
            onPress={() => router.push('/(merchant)/enroll-qr')}
          />
          <SettingsRow
            label={`Équipe — ${staff.data?.filter((member) => member.active).length ?? 0} caissier(s)`}
            onPress={() => router.push('/(merchant)/team')}
          />
          <SettingsRow label="Notifications" />
          <SettingsRow
            label={
              profile?.phone_verified_at ? 'Téléphone vérifié' : 'Vérifier mon téléphone'
            }
            onPress={() => router.push('/verify-phone' as Href)}
          />
          <SettingsRow
            label="Support"
            onPress={() => router.push('/support' as Href)}
            last
          />
        </View>

        <Button
          label="Déconnexion"
          variant="danger"
          loading={signOut.isPending}
          loadingLabel="Déconnexion…"
          onPress={() => signOut.mutate()}
          style={styles.signOut}
          trailing={<Text style={styles.signOutArrow}>→</Text>}
        />
      </View>
    </Screen>
  );
}

function SettingsRow({
  label,
  onPress,
  last = false,
}: {
  label: string;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        last ? styles.lastRow : null,
        pressed ? { opacity: 0.86 } : null,
      ]}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 14, gap: 20 },
  merchant: {
    borderTopWidth: 2,
    borderTopColor: colors.ink,
    paddingTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logo: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#FDEEE3',
    borderWidth: 1,
    borderColor: '#F6DCC8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: { fontSize: 26, lineHeight: 32 },
  merchantCopy: { flex: 1, gap: 3 },
  merchantName: {
    color: colors.ink,
    fontFamily: fontFamily.extrabold,
    fontSize: 19,
    lineHeight: 25,
    letterSpacing: -0.38,
  },
  merchantMeta: {
    color: '#6B7280',
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    lineHeight: 18,
  },
  menu: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    overflow: 'hidden',
  },
  row: {
    minHeight: 53,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F6',
  },
  lastRow: { borderBottomWidth: 0 },
  rowLabel: {
    flex: 1,
    color: colors.ink,
    fontFamily: fontFamily.bold,
    fontSize: 15,
    lineHeight: 21,
  },
  chevron: { color: '#C2C8D2', fontSize: 22, lineHeight: 22 },
  signOut: { backgroundColor: colors.white, borderColor: '#F3D3C2' },
  signOutArrow: { color: colors.danger, fontSize: 17, lineHeight: 20 },
});
