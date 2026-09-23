import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { colors, minTouchTarget, spacing, typography } from '@/theme';
import { Text } from './Text';

export type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  optional?: boolean;
  containerStyle?: ViewStyle;
  /** Surcharge du champ lui-même — code à usage unique, montants. */
  inputStyle?: TextStyle;
};

export function TextField({
  label,
  error,
  hint,
  optional = false,
  containerStyle,
  inputStyle,
  ...rest
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      <Text variant="label" tone="secondary" style={styles.label}>
        {label}
        {optional ? ' — optionnel' : ''}
      </Text>

      <TextInput
        {...rest}
        accessibilityLabel={label}
        placeholderTextColor={colors.textTertiary}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        style={[
          styles.input,
          {
            borderColor: error
              ? colors.danger
              : focused
                ? colors.primary
                : colors.borderInput,
          },
          inputStyle,
        ]}
      />

      {/* L'erreur remplace l'indication : les empiler ferait sauter la mise en
          page à chaque saisie invalide. */}
      {error ? (
        <Text variant="caption" tone="danger" style={styles.helper}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="tertiary" style={styles.helper}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 7 },
  label: { color: '#3A4353' },
  input: {
    ...typography.bodyMedium,
    color: colors.ink,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    minHeight: minTouchTarget,
  },
  helper: { marginTop: spacing.xs / 2 },
});
