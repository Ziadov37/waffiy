/** Espacements — multiples de 4, pour que les grilles de pastilles s'alignent. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
} as const;

/**
 * Ombres discrètes. Les cartes de fidélité se distinguent par leur teinte,
 * pas par leur relief : une ombre marquée alourdirait l'écran d'accueil qui
 * en empile plusieurs.
 */
export const shadows = {
  card: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;

/**
 * Taille minimale d'une cible tactile. 44 pt est le seuil des recommandations
 * d'accessibilité d'Apple et de Google ; le bouton de scan du commerçant est
 * bien au-delà, mais les pastilles et les puces de filtre doivent le respecter.
 */
export const minTouchTarget = 44;

/**
 * Au-delà de ce seuil, la progression bascule des pastilles vers une barre :
 * 13 pastilles ne tiennent plus sur une largeur de téléphone sans devenir
 * illisibles (contrainte de la direction artistique).
 */
export const maxStampDots = 12;
