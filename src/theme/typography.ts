import { Platform } from 'react-native';

/**
 * Manrope, imposée par la direction artistique.
 * Les noms de familles correspondent à ceux exposés par @expo-google-fonts/manrope.
 */
export const fontFamily = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
} as const;

/**
 * Échelle typographique. `lineHeight` est toujours explicite : les valeurs par
 * défaut de React Native diffèrent entre iOS et Android et décaleraient les
 * grilles de pastilles.
 */
export const typography = {
  display: { fontFamily: fontFamily.extrabold, fontSize: 34, lineHeight: 40 },
  title: { fontFamily: fontFamily.extrabold, fontSize: 24, lineHeight: 30 },
  heading: { fontFamily: fontFamily.bold, fontSize: 19, lineHeight: 25 },
  subheading: { fontFamily: fontFamily.semibold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 22 },
  bodyMedium: { fontFamily: fontFamily.medium, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fontFamily.semibold, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fontFamily.medium, fontSize: 12, lineHeight: 16 },
  button: { fontFamily: fontFamily.bold, fontSize: 16, lineHeight: 20 },
  /** Compteur de progression, « 8 / 10 ». */
  counter: { fontFamily: fontFamily.extrabold, fontSize: 28, lineHeight: 32 },
} as const;

/**
 * Les emoji ne doivent pas hériter de Manrope : sur Android, une famille
 * personnalisée les rend en monochrome.
 */
export const emojiFont = Platform.select({ android: { fontFamily: undefined } }) ?? {};
