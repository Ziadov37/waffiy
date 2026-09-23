import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { colors, radius, shadows, spacing } from '@/theme';

export type ActionModalProps = {
  visible: boolean;
  emoji?: string;
  title: string;
  message?: string;
  children?: ReactNode;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'reward' | 'danger';
  cancelLabel?: string;
  loading?: boolean;
  loadingLabel?: string;
  onConfirm?: () => void;
  onCancel: () => void;
};

/**
 * Modale de confirmation, de succès et d'erreur.
 *
 * Un seul composant pour les trois : elles partagent la même structure et le
 * même comportement de fermeture, et les séparer aurait multiplié les
 * occasions de les faire diverger visuellement.
 *
 * Fermeture au clic sur le fond volontairement DÉSACTIVÉE pendant le
 * chargement : un commerçant qui ferme la modale en plein enregistrement ne
 * saurait plus si la visite a été créditée.
 */
export function ActionModal({
  visible,
  emoji,
  title,
  message,
  children,
  confirmLabel,
  confirmVariant = 'primary',
  cancelLabel = 'Annuler',
  loading = false,
  loadingLabel = 'Enregistrement…',
  onConfirm,
  onCancel,
}: ActionModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!loading) onCancel();
      }}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onCancel}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Fermer"
        />
        {/* Le fond est un frère du contenu pour éviter les boutons imbriqués
            sur le web et les fermetures au clic dans la modale. */}
        <View style={[styles.sheet, shadows.raised]} accessibilityViewIsModal>
          {emoji ? <Text style={styles.emoji}>{emoji}</Text> : null}

          <Text variant="heading" center>
            {title}
          </Text>

          {message ? (
            <Text tone="secondary" center>
              {message}
            </Text>
          ) : null}

          {children}

          <View style={styles.actions}>
            {confirmLabel && onConfirm ? (
              <Button
                label={confirmLabel}
                variant={confirmVariant}
                loading={loading}
                loadingLabel={loadingLabel}
                onPress={onConfirm}
              />
            ) : null}
            <Button
              label={cancelLabel}
              variant="ghost"
              disabled={loading}
              onPress={onCancel}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.white,
    borderRadius: radius.xxl,
    padding: spacing.xl,
    gap: spacing.md,
    alignItems: 'stretch',
  },
  emoji: { fontSize: 40, lineHeight: 48, textAlign: 'center' },
  actions: { gap: spacing.sm, marginTop: spacing.md },
});
