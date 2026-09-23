import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';
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
      <View style={styles.topRow}>
        {showBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={closeIcon ? 'Fermer' : 'Retour'}
            onPress={goBack}
            style={styles.button}
            hitSlop={8}
          >
            <Icon
              name={closeIcon ? 'close' : 'arrow-left'}
              color={colors.ink}
              size={18}
            />
          </Pressable>
        ) : null}
        {eyebrow ? (
          <Text variant="caption" tone="tertiary" style={styles.eyebrow}>
            {eyebrow}
          </Text>
        ) : null}
        <View style={styles.right}>{right}</View>
      </View>
      {title ? (
        <Text variant="title" numberOfLines={2}>
          {title}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    gap: 18,
    paddingTop: 18,
    paddingBottom: 4,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  button: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.54,
    textTransform: 'uppercase',
  },
  right: { minWidth: 0, marginLeft: 'auto' },
});
