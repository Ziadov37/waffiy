import type { ReactNode } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

type ScreenProps = {
  children: ReactNode;
  /** Un écran de liste gère son propre défilement : passer false. */
  scroll?: boolean;
  background?: string;
  edges?: readonly Edge[];
  padded?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  contentStyle?: ViewStyle;
  footer?: ReactNode;
};

/**
 * Enveloppe commune à tous les écrans : zones sûres, fond, et espacement bas
 * suffisant pour que le dernier élément ne soit pas mangé par la barre
 * d'onglets ou l'indicateur d'accueil.
 */
export function Screen({
  children,
  scroll = true,
  background = colors.background,
  edges = ['top'],
  padded = true,
  onRefresh,
  refreshing = false,
  contentStyle,
  footer,
}: ScreenProps) {
  const inner: ViewStyle = {
    ...(padded ? { paddingHorizontal: spacing.lg } : null),
    ...contentStyle,
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: background }]} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[inner, styles.scrollContent]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.root, inner]}>{children}</View>
      )}
      {footer}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xxxl },
});
