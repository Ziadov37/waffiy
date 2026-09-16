import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, minTouchTarget, radius, spacing } from '@/theme';
import { Icon } from './Icon';
import { Text } from './Text';

type AppBarProps = {
  title?: string;
  /** Ligne de contexte au-dessus du titre, par exemple « Étape 1 sur 3 ». */
  eyebrow?: string;
  onBack?: () => void;
  showBack?: boolean;
  right?: React.ReactNode;
  /** Variante fermeture, pour les écrans présentés en modale. */
  closeIcon?: boolean;
};

export function AppBar({
  title,
  eyebrow,
  onBack,
  showBack = true,
  right,
  closeIcon = false,
}: AppBarProps) {
  const router = useRouter();

  const goBack = () => {
    if (onBack) return onBack();
    // dismissTo plutôt que back() : sur un parcours multi-étapes, revenir en
    // arrière depuis la première étape doit sortir du parcours, pas échouer.
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <View style={styles.bar}>
      {showBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={closeIcon ? 'Fermer' : 'Retour'}
          onPress={goBack}
          style={styles.button}
          hitSlop={8}
        >
          <Icon name={closeIcon ? 'close' : 'arrow-left'} color={colors.ink} size={20} />
        </Pressable>
      ) : (
        <View style={styles.spacer} />
      )}

      <View style={styles.titles}>
        {eyebrow ? (
          <Text variant="caption" tone="tertiary">
            {eyebrow}
          </Text>
        ) : null}
        {title ? (
          <Text variant="heading" numberOfLines={1}>
            {title}
          </Text>
        ) : null}
      </View>

      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  button: {
    width: minTouchTarget,
    height: minTouchTarget,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: { width: 0 },
  titles: { flex: 1 },
  right: { minWidth: 0 },
});
