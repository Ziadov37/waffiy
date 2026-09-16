import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, maxStampDots, radius, spacing } from '@/theme';

export type ProgressDisplayProps = {
  stamps: number;
  threshold: number;
  /** Compact : pastilles plus petites, pour l'aperçu d'une carte en liste. */
  compact?: boolean;
};

/**
 * Affichage de la progression.
 *
 * Contrainte de la direction artistique : pastilles cochées jusqu'à 12 visites,
 * barre de progression au-delà. Le seuil n'est pas arbitraire — au-delà de 12,
 * les pastilles deviennent trop petites pour être comptées d'un coup d'œil sur
 * une largeur de téléphone, ce qui est précisément leur seul intérêt.
 *
 * L'ensemble est exposé à l'accessibilité comme UNE valeur, pas comme N
 * pastilles : un lecteur d'écran annonce « 8 sur 10 visites » au lieu
 * d'énumérer dix cases.
 */
export function ProgressDisplay({ stamps, threshold, compact = false }: ProgressDisplayProps) {
  const filled = Math.min(stamps, threshold);
  const ready = stamps >= threshold;
  const accent = ready ? colors.reward : colors.primary;

  const a11y = {
    accessible: true,
    accessibilityRole: 'progressbar' as const,
    accessibilityLabel: `Progression : ${filled} sur ${threshold} visites`,
    accessibilityValue: { min: 0, max: threshold, now: filled },
  };

  if (threshold > maxStampDots) {
    const ratio = Math.min(stamps / threshold, 1);
    return (
      <View {...a11y} style={styles.barTrack}>
        <View
          style={[styles.barFill, { width: `${ratio * 100}%`, backgroundColor: accent }]}
        />
      </View>
    );
  }

  const size = compact ? 18 : 26;

  return (
    <View {...a11y} style={styles.dots}>
      {Array.from({ length: threshold }, (_, i) => {
        const on = i < filled;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: on ? accent : colors.white,
                borderColor: on ? accent : colors.borderInput,
              },
            ]}
          >
            {on && !compact ? (
              <Text variant="caption" style={styles.check}>
                ✓
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dot: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  check: { color: colors.white, fontSize: 13, lineHeight: 16 },
  barTrack: {
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: radius.pill },
});
