import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, minTouchTarget, radius, shadows, spacing } from '@/theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type TabItem = {
  /** Nom de la route, tel que déclaré dans <Tabs.Screen name=… />. */
  name: string;
  label: string;
  icon: IconName;
  /** Pastille de compteur, pour les notifications non lues. */
  badge?: number;
};

export type CenterAction = {
  label: string;
  icon: IconName;
  onPress: () => void;
  /** Vert pour le QR client, encre pour le scan commerçant. */
  tone?: 'primary' | 'ink';
};

/**
 * Forme minimale de ce que `<Tabs tabBar={…} />` fournit.
 *
 * Volontairement structurel plutôt qu'importé : expo-router redéfinit ses
 * propres types d'onglets, incompatibles avec ceux de @react-navigation sous
 * `exactOptionalPropertyTypes`. Ne déclarer que les deux champs réellement
 * utilisés évite d'être pris en otage par cette divergence.
 */
type TabBarNavigationProps = {
  state: { index: number; routes: readonly { key: string; name: string }[] };
  navigation: { navigate: (name: never) => void };
};

type Props = TabBarNavigationProps & {
  items: readonly TabItem[];
  center: CenterAction;
};

/**
 * Barre de navigation à cinq emplacements, dont un bouton central en relief.
 *
 * La barre par défaut de React Navigation ne sait pas faire déborder un bouton
 * au-dessus de la barre. Or c'est le geste principal des deux rôles : le client
 * doit ouvrir son QR en un seul appui depuis n'importe quel écran (contrainte
 * de la direction artistique), et le commerçant doit scanner sans chercher.
 *
 * Le bouton central n'est PAS un onglet : il ouvre un écran présenté en modale,
 * et ne doit donc jamais apparaître comme sélectionné.
 */
export function TabBar({ state, navigation, items, center }: Props) {
  const insets = useSafeAreaInsets();
  const activeRoute = state.routes[state.index]?.name;

  const left = items.slice(0, 2);
  const right = items.slice(2);

  const renderTab = (item: TabItem) => {
    const focused = activeRoute === item.name;
    const tint = focused ? colors.primary : colors.textTertiary;

    return (
      <Pressable
        key={item.name}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={item.label}
        onPress={() => {
          if (!focused) navigation.navigate(item.name as never);
        }}
        style={styles.tab}
      >
        <View>
          <Icon name={item.icon} color={tint} size={22} />
          {item.badge && item.badge > 0 ? (
            <View style={styles.badge}>
              <Text variant="caption" style={styles.badgeText}>
                {item.badge > 9 ? '9+' : String(item.badge)}
              </Text>
            </View>
          ) : null}
        </View>
        <Text variant="caption" style={{ color: tint }} numberOfLines={1}>
          {item.label}
        </Text>
      </Pressable>
    );
  };

  const centerBg = center.tone === 'ink' ? colors.ink : colors.primary;

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {left.map(renderTab)}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={center.label}
        onPress={center.onPress}
        style={({ pressed }) => [styles.tab, pressed ? { opacity: 0.9 } : null]}
      >
        <View style={[styles.centerButton, shadows.raised, { backgroundColor: centerBg }]}>
          <Icon name={center.icon} color={colors.white} size={26} strokeWidth={2.1} />
        </View>
        <Text variant="caption" style={styles.centerLabel} numberOfLines={1}>
          {center.label}
        </Text>
      </Pressable>

      {right.map(renderTab)}
    </View>
  );
}

const CENTER_SIZE = 56;

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    minHeight: minTouchTarget,
  },
  centerButton: {
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    // Déborde au-dessus de la barre, comme dans le prototype.
    marginTop: -(CENTER_SIZE / 2 + spacing.xs),
  },
  centerLabel: { color: colors.textSecondary },
  badge: {
    position: 'absolute',
    top: -5,
    right: -9,
    minWidth: 17,
    height: 17,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: colors.white, fontSize: 10, lineHeight: 13 },
});
