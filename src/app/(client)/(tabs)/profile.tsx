import { type Href, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar, Button, Icon, Screen, Text } from '@/components/ui';
import {
  useIsAnonymous,
  useMyMerchant,
  useProfile,
  useSignOut,
} from '@/features/auth/hooks';
import { useCards, useUsedRewards } from '@/features/cards/hooks';
import { fullName, initials, memberSince } from '@/lib/format';
import { useSessionStore } from '@/stores/session';
import { colors, fontFamily, spacing } from '@/theme';

export default function ClientProfile() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const { data: merchant, isPending: merchantPending } = useMyMerchant();
  const { data: cards } = useCards();
  const { data: used } = useUsedRewards();
  const signOut = useSignOut();
  const anonymous = useIsAnonymous();
  const setActiveRole = useSessionStore((state) => state.setActiveRole);

  const openMerchantSpace = () => {
    if (merchant) {
      setActiveRole('merchant');
      router.replace('/(merchant)/(tabs)');
      return;
    }

    router.push('/(auth)/signup-merchant/commerce');
  };

  return (
    <Screen>
      <View style={styles.content}>
        <Text variant="title">Profil</Text>

        <View style={styles.identity}>
          <Avatar
            initials={
              profile?.first_name ? initials(profile.first_name, profile.last_name) : 'W'
            }
            size={62}
          />
          <View style={styles.identityText}>
            <Text variant="heading">
              {profile?.first_name
                ? fullName(profile.first_name, profile.last_name)
                : 'Client Waffiy'}
            </Text>
            <Text variant="caption" tone="secondary">
              {profile ? memberSince(profile.created_at) : ''}
            </Text>
          </View>
        </View>

        {anonymous ? (
          <View style={styles.secureCard}>
            <View style={styles.roleCopy}>
              <Text variant="subheading">Sauvegardez vos cartes</Text>
              <Text variant="caption" tone="secondary">
                Elles sont actuellement liées à cet appareil. Ajoutez un email vérifié
                pour les retrouver si vous changez de téléphone.
              </Text>
            </View>
            <Button
              label="Sécuriser mes cartes"
              onPress={() => router.push('/(client)/secure-account' as Href)}
            />
          </View>
        ) : null}

        <View style={styles.stats}>
          <Stat label="Cartes" value={cards?.length ?? 0} />
          <Stat label="Récompenses" value={used?.length ?? 0} />
        </View>

        {!anonymous ? (
          <View style={styles.roleCard}>
            <View style={styles.roleCopy}>
              <Text variant="subheading">
                {merchant ? merchant.name : 'Vous avez un commerce ?'}
              </Text>
              <Text variant="caption" tone="secondary">
                {merchant
                  ? 'Gérez vos clients et votre programme de fidélité.'
                  : 'Créez votre espace commerçant avec ce même compte.'}
              </Text>
            </View>
            <Button
              label={merchant ? 'Passer en mode commerçant' : 'Devenir commerçant'}
              variant="secondary"
              size="md"
              loading={merchantPending}
              loadingLabel="Vérification…"
              onPress={openMerchantSpace}
            />
          </View>
        ) : null}

        <View style={styles.menu}>
          <MenuRow
            label="Mes informations"
            onPress={() => router.push('/account-info' as Href)}
          />
          {!anonymous ? (
            <MenuRow
              label={
                profile?.phone_verified_at
                  ? `Téléphone vérifié — ${profile.phone}`
                  : 'Vérifier mon téléphone'
              }
              onPress={() => router.push('/verify-phone' as Href)}
            />
          ) : null}
          <MenuRow
            label="Notifications"
            onPress={() => router.push('/(client)/(tabs)/notifications')}
          />
          <MenuRow
            label="Langue — Français"
            onPress={() => router.push('/language' as Href)}
          />
          <MenuRow
            label="Aide et support"
            onPress={() => router.push('/support' as Href)}
          />
        </View>

        {!anonymous ? (
          <Button
            label="Déconnexion"
            variant="danger"
            loading={signOut.isPending}
            loadingLabel="Déconnexion…"
            onPress={() => signOut.mutate()}
            style={styles.signOut}
            trailing={<Text style={styles.signOutArrow}>→</Text>}
          />
        ) : null}
      </View>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function MenuRow({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        styles.menuRow,
        { opacity: disabled ? 0.5 : pressed ? 0.9 : 1 },
      ]}
    >
      <Text style={styles.menuLabel}>{label}</Text>
      <Icon name="chevron-right" size={18} color={colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 14, gap: 22 },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderTopWidth: 2,
    borderTopColor: colors.ink,
    paddingTop: 18,
  },
  identityText: { flex: 1, gap: 2 },
  stats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  roleCard: {
    gap: 14,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C8EEDA',
    backgroundColor: '#EFFBF4',
  },
  secureCard: {
    gap: 14,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.rewardBorder,
    backgroundColor: colors.rewardSurface,
  },
  roleCopy: { gap: 4 },
  stat: {
    flex: 1,
    gap: 5,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 16,
  },
  statLabel: {
    color: colors.textMuted,
    fontFamily: fontFamily.bold,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.32,
    textTransform: 'uppercase',
  },
  statValue: {
    color: colors.ink,
    fontFamily: fontFamily.extrabold,
    fontSize: 25,
    lineHeight: 31,
    letterSpacing: -0.75,
  },
  menu: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F6',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  menuLabel: {
    flex: 1,
    color: colors.ink,
    fontFamily: fontFamily.bold,
    fontSize: 15,
    lineHeight: 21,
  },
  signOut: { backgroundColor: colors.white, borderColor: '#F3D3C2' },
  signOutArrow: { color: colors.danger, fontSize: 17, lineHeight: 20 },
});
