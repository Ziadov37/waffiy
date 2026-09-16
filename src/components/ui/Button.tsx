import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type ViewStyle,
} from 'react-native';

import { colors, minTouchTarget, radius, spacing, typography } from '@/theme';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'reward' | 'ghost' | 'danger';
type Size = 'md' | 'lg';

export type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Libellé affiché pendant le chargement, par exemple « Enregistrement… ». */
  loadingLabel?: string;
  fullWidth?: boolean;
  style?: ViewStyle;
};

const SURFACES: Record<Variant, { bg: string; border: string; fg: string }> = {
  primary: { bg: colors.primary, border: colors.primary, fg: colors.white },
  // L'or n'apparaît que sur les actions liées à une récompense.
  reward: { bg: colors.reward, border: colors.reward, fg: colors.white },
  secondary: { bg: colors.white, border: colors.borderInput, fg: colors.ink },
  ghost: { bg: 'transparent', border: 'transparent', fg: colors.textSecondary },
  danger: { bg: colors.dangerSurface, border: colors.danger, fg: colors.danger },
};

export function Button({
  label,
  variant = 'primary',
  size = 'lg',
  loading = false,
  loadingLabel,
  fullWidth = true,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const surface = SURFACES[variant];
  const isDisabled = Boolean(disabled) || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        {
          backgroundColor: surface.bg,
          borderColor: surface.border,
          // Un bouton désactivé reste lisible : on atténue sans effacer, pour
          // que le commerçant comprenne qu'il existe mais n'est pas disponible.
          opacity: isDisabled ? 0.55 : pressed ? 0.88 : 1,
          ...(fullWidth ? { alignSelf: 'stretch' } : { alignSelf: 'flex-start' }),
        },
        style,
      ]}
      {...rest}
    >
      <View style={styles.content}>
        {loading ? <ActivityIndicator size="small" color={surface.fg} /> : null}
        <Text style={[typography.button, { color: surface.fg }]}>
          {loading ? (loadingLabel ?? label) : label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: minTouchTarget,
  },
  lg: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl },
  md: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
