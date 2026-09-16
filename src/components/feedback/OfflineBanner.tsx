import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

/**
 * Bandeau hors ligne.
 *
 * S'abonne à onlineManager plutôt qu'à NetInfo directement : c'est la même
 * source que celle qui pilote TanStack Query et la mise en file. Deux sources
 * distinctes pourraient afficher « hors ligne » pendant que les requêtes
 * partent, ou l'inverse.
 */
export function OfflineBanner({ pendingCount = 0 }: { pendingCount?: number }) {
  const online = useSyncExternalStore(
    (listener) => onlineManager.subscribe(listener),
    () => onlineManager.isOnline(),
    () => true,
  );

  if (online && pendingCount === 0) return null;

  const offline = !online;

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.banner,
        {
          backgroundColor: offline ? colors.ink : colors.rewardSurface,
          borderColor: offline ? colors.ink : colors.rewardBorder,
        },
      ]}
    >
      <Icon
        name={offline ? 'wifi-off' : 'clock'}
        size={18}
        color={offline ? colors.white : colors.rewardText}
      />
      <Text
        variant="caption"
        style={{ color: offline ? colors.white : colors.rewardText, flex: 1 }}
      >
        {offline
          ? pendingCount > 0
            ? `Hors ligne — ${pendingCount} action${pendingCount > 1 ? 's' : ''} en attente de synchronisation`
            : 'Hors ligne — les scans seront synchronisés au retour du réseau'
          : `${pendingCount} action${pendingCount > 1 ? 's' : ''} en attente de synchronisation`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
