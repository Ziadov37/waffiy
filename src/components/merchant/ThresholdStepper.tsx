import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components/ui';
import { colors, minTouchTarget, radius, spacing } from '@/theme';

export type ThresholdStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
};

/**
 * Sélecteur du nombre de visites nécessaires.
 *
 * Boutons plutôt que champ de saisie : la valeur est presque toujours entre 5
 * et 12, et un clavier numérique ouvert par-dessus l'aperçu client masquerait
 * précisément ce que le commerçant cherche à évaluer.
 */
export function ThresholdStepper({
  value,
  onChange,
  min = 2,
  max = 50,
}: ThresholdStepperProps) {
  const step = (delta: number) => {
    const next = Math.min(Math.max(value + delta, min), max);
    if (next !== value) onChange(next);
  };

  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Nombre de visites nécessaires"
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Retirer une visite"
        onPress={() => step(-1)}
        disabled={value <= min}
        style={({ pressed }) => [
          styles.button,
          { opacity: value <= min ? 0.4 : pressed ? 0.8 : 1 },
        ]}
      >
        <Icon name="minus" size={20} color={colors.ink} />
      </Pressable>

      <Text variant="counter" style={styles.value}>
        {value}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ajouter une visite"
        onPress={() => step(1)}
        disabled={value >= max}
        style={({ pressed }) => [
          styles.button,
          { opacity: value >= max ? 0.4 : pressed ? 0.8 : 1 },
        ]}
      >
        <Icon name="plus" size={20} color={colors.ink} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  button: {
    width: minTouchTarget,
    height: minTouchTarget,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { minWidth: 56, textAlign: 'center' },
});
