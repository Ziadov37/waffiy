import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { colors, typography } from '@/theme';

type Variant = keyof typeof typography;
type Tone = 'ink' | 'secondary' | 'tertiary' | 'primary' | 'reward' | 'white' | 'danger';

const TONES: Record<Tone, string> = {
  ink: colors.ink,
  secondary: colors.textSecondary,
  tertiary: colors.textTertiary,
  primary: colors.primary,
  reward: colors.rewardText,
  white: colors.white,
  danger: colors.danger,
};

export type TextProps = RNTextProps & {
  variant?: Variant;
  tone?: Tone;
  center?: boolean;
};

/**
 * Tout texte de l'application passe par ici.
 *
 * C'est ce qui garantit que Manrope et l'échelle typographique s'appliquent
 * partout : un `<Text>` de React Native utilisé directement retomberait sur la
 * police système, visible immédiatement à côté d'un texte conforme.
 */
export function Text({
  variant = 'body',
  tone = 'ink',
  center = false,
  style,
  ...rest
}: TextProps) {
  const base: TextStyle = {
    ...typography[variant],
    color: TONES[tone],
    ...(center ? { textAlign: 'center' } : null),
  };
  return <RNText {...rest} style={[base, style]} />;
}
