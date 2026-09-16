/**
 * Palette Waffiy, extraite du prototype (docs/design/).
 *
 * Aucune couleur ne doit être écrite en dur dans un composant. En particulier
 * `reward` : la direction artistique impose que l'or ne serve QU'À la
 * récompense. Le nommer par son rôle plutôt que par sa teinte rend toute
 * entorse visible à la relecture.
 */
export const colors = {
  /** Vert principal — progression et actions positives. */
  primary: '#16A36A',
  /** Vert foncé — état pressé, texte vert sur fond clair. */
  primaryDark: '#0F7E51',
  /** Fond vert très clair — bandeaux de succès, programme sélectionné. */
  primarySurface: '#EFFBF4',
  primaryBorder: '#C8EEDA',

  /** Or — récompense disponible. JAMAIS utilisé ailleurs. */
  reward: '#B7791F',
  rewardSurface: '#FFF8E8',
  rewardBorder: '#F1DCA9',
  rewardText: '#8A6A1E',

  /** Encre — textes principaux et boutons secondaires. */
  ink: '#0F172A',
  textSecondary: '#56606F',
  textTertiary: '#9AA3B0',
  textMuted: '#8A93A3',

  border: '#E6E9F0',
  /** Bordure de champ de saisie, légèrement plus marquée. */
  borderInput: '#DFE3EB',

  /** Fond de l'application, derrière les cartes blanches. */
  background: '#E7E9EE',
  surface: '#FFFFFF',
  /** Surface neutre — pastilles inactives, filtres non sélectionnés. */
  surfaceMuted: '#F2F4F8',

  danger: '#C2410C',
  dangerSurface: '#FEF2EE',

  white: '#FFFFFF',
} as const;

/**
 * Teintes de carte proposées à l'édition d'un programme.
 * Le commerçant choisit parmi ces couples surface/bordure, plutôt que de
 * saisir un code hexadécimal qui produirait des cartes illisibles.
 */
export const cardTints = [
  { key: 'amber', surface: '#FDEEE3', border: '#F6DCC8', label: 'Ambre' },
  { key: 'blue', surface: '#EDF1FA', border: '#DCE3F2', label: 'Bleu' },
  { key: 'violet', surface: '#F3EDFA', border: '#E4DAF2', label: 'Violet' },
  { key: 'mint', surface: '#E9F7F0', border: '#CFEADD', label: 'Menthe' },
  { key: 'rose', surface: '#FCECEF', border: '#F5D7DD', label: 'Rose' },
  { key: 'sand', surface: '#F5F1E8', border: '#E7DFCC', label: 'Sable' },
] as const;

export type CardTint = (typeof cardTints)[number];

export const defaultTint = cardTints[0];
