import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar, Button, Card, Icon, Screen, Text } from '@/components/ui';
import { useMyMerchant, useProfile, useSignOut } from '@/features/auth/hooks';
import { useCards, useUsedRewards } from '@/features/cards/hooks';
import { formatPublicCode, fullName, initials, memberSince } from '@/lib/format';
import { useSessionStore } from '@/stores/session';
import { colors, radius, spacing } from '@/theme';

export default function ClientProfile() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const { data: cards } = useCards();
  const { data: used } = useUsedRewards();
  const { data: merchant } = useMyMerchant();
  const setActiveRole = useSessionStore((s) => s.setActiveRole);
  const signOut = useSignOut();

  return (
    <Screen>
      <Text variant="title" style={styles.title}>
        Profil
      </Text>

      <Card>
        <View style={styles.identity}>
          <Avatar
            initials={profile ? initials(profile.first_name, profile.last_name) : '?'}
            size={64}
          />
          <View style={styles.identityText}>
            <Text variant="heading">
              {profile ? fullName(profile.first_name, profile.last_name) : '—'}
            </Text>
            <Text variant="caption" tone="secondary">
              {profile ? memberSince(profile.created_at) : ''}
            </Text>
            {profile ? (
              <Text variant="caption" tone="tertiary">
                {formatPublicCode(profile.public_code)}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.stats}>
          <Stat label="Cartes" value={cards?.length ?? 0} />
          <Stat label="Récompenses" value={used?.length ?? 0} />
        </View>
      </Card>

      <View style={styles.menu}>
        <MenuRow
          label="Mes récompenses"
          onPress={() => router.push('/(client)/rewards')}
        />
        <MenuRow
          label="Scanner un commerce"
          onPress={() => router.push('/(client)/scan-merchant')}
        />
        {/* Décision D2 : le rôle est une capacité. Un compte qui possède un
            commerce bascule d'un point de vue à l'autre sans se déconnecter. */}
        {merchant ? (
          <MenuRow
            label={`Passer en mode commerçant — ${merchant.name}`}
            onPress={() => {
              setActiveRole('merchant');
              router.replace('/(merchant)');
            }}
          />
        ) : (
          <MenuRow
            label="Créer mon commerce"
            onPress={() => router.push('/(auth)/signup-merchant/commerce')}
          />
        )}
        <MenuRow label="Langue — Français" disabled />
        <MenuRow label="Aide et support" disabled />
      </View>

      <Button
        label="Déconnexion"
        variant="secondary"
        loading={signOut.isPending}
        loadingLabel="Déconnexion…"
        onPress={() => signOut.mutate()}
        style={styles.signOut}
      />
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text variant="heading">{value}</Text>
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
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
      <Text variant="bodyMedium" style={styles.menuLabel}>
        {label}
      </Text>
      <Icon name="chevron-right" size={18} color={colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { paddingVertical: spacing.lg },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  identityText: { flex: 1, gap: 2 },
  stats: {
    flexDirection: 'row',
    gap: spacing.xxl,
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stat: { gap: 2 },
  menu: { marginTop: spacing.xl, gap: spacing.sm },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  menuLabel: { flex: 1 },
  signOut: { marginTop: spacing.xxl },
});
