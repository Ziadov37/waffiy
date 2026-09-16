import { useRef, useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppBar, Button, Screen, Text } from '@/components/ui';
import { useJoinMerchant } from '@/features/cards/hooks';
import { toAppError } from '@/lib/errors';
import { parseScannedCode } from '@/lib/qr';
import { colors, radius, spacing } from '@/theme';

/**
 * Le client scanne le QR affiché en vitrine pour obtenir sa carte.
 *
 * C'est l'UNIQUE voie d'inscription (décision D5) : un commerçant ne peut pas
 * inscrire quelqu'un à son insu. Cet écran ne figurait pas dans la liste du
 * cahier des charges, mais sans lui aucun client ne pourrait jamais obtenir sa
 * première carte (contradiction C2).
 */
export default function ScanMerchant() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState<string>();
  const join = useJoinMerchant();

  // La caméra émet plusieurs lectures par seconde sur le même code : sans ce
  // verrou, un seul cadrage déclencherait une dizaine d'appels réseau.
  const handled = useRef(false);

  const onScan = (raw: string) => {
    if (handled.current || join.isPending) return;

    const parsed = parseScannedCode(raw);
    if (!parsed || parsed.kind !== 'merchant') {
      setError('Ce QR code n’est pas un QR d’inscription Waffiy.');
      return;
    }

    handled.current = true;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    join.mutate(parsed.code, {
      onSuccess: (result) => {
        router.replace(`/(client)/card/${result.merchant_id}`);
      },
      onError: (err) => {
        handled.current = false;
        setError(toAppError(err).message);
      },
    });
  };

  if (!permission) {
    return (
      <Screen>
        <AppBar title="Scanner un commerce" closeIcon />
        <Text tone="secondary">Préparation de la caméra…</Text>
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen>
        <AppBar title="Scanner un commerce" closeIcon />
        <View style={styles.permission}>
          <Text variant="heading" center>
            Accès à la caméra
          </Text>
          <Text tone="secondary" center>
            Waffiy a besoin de la caméra pour lire le QR code affiché dans le commerce.
          </Text>
          <Button label="Autoriser la caméra" onPress={() => void requestPermission()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen background={colors.ink} edges={['top', 'bottom']} scroll={false}>
      <AppBar title="" closeIcon />

      <View style={styles.viewfinder}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => onScan(data)}
        />
        <View style={styles.frame} pointerEvents="none" />
      </View>

      <View style={styles.footer}>
        <Text variant="heading" tone="white" center>
          {join.isPending ? 'Inscription en cours…' : 'Scannez le QR code du commerce'}
        </Text>
        <Text style={styles.hint} center>
          {error ?? 'Il est affiché en vitrine ou près de la caisse.'}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  viewfinder: {
    flex: 1,
    margin: spacing.lg,
    borderRadius: radius.xxl,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  permission: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  frame: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    margin: spacing.xxxl,
    borderWidth: 3,
    borderColor: colors.white,
    borderRadius: radius.xl,
    opacity: 0.85,
  },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.sm },
  hint: { color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 18 },
});
