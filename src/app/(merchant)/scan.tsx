import { useEffect, useRef, useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppBar, Button, Screen, Text, TextField } from '@/components/ui';
import { parseScannedCode } from '@/lib/qr';
import { colors, spacing } from '@/theme';

/**
 * Scan du QR client par le commerçant.
 *
 * La saisie manuelle n'est pas un repli de confort : une caméra rayée, un
 * écran de client cassé ou une vitre de comptoir suffisent à empêcher la
 * lecture, et il est hors de question de renvoyer un client parce que
 * l'appareil ne veut pas lire.
 */
export default function MerchantScan() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [requestingPermission, setRequestingPermission] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState<string>();
  const handled = useRef(false);
  const permissionRequested = useRef(false);

  // Le clic sur l'onglet SCAN doit mener directement au lecteur. Au premier
  // passage, on déclenche donc la demande système sans imposer un écran
  // intermédiaire propre à Waffiy.
  useEffect(() => {
    if (!permission || permission.granted || !permission.canAskAgain) return;
    if (permissionRequested.current) return;

    permissionRequested.current = true;
    setRequestingPermission(true);
    void requestPermission().finally(() => setRequestingPermission(false));
  }, [permission, requestPermission]);

  const open = (code: string) => {
    if (handled.current) return;
    handled.current = true;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace(`/(merchant)/scanned/${code}`);
  };

  const onScan = (raw: string) => {
    const parsed = parseScannedCode(raw);
    if (!parsed || parsed.kind !== 'client') {
      setError('Ce QR code n’est pas une carte Waffiy.');
      return;
    }
    open(parsed.code);
  };

  const submitManual = () => {
    const parsed = parseScannedCode(manualCode);
    if (!parsed || parsed.kind !== 'client') {
      setError('Code invalide. Il comporte 10 caractères, affiché sous le QR du client.');
      return;
    }
    open(parsed.code);
  };

  if (!permission || requestingPermission) {
    return (
      <Screen background={colors.ink} edges={['top', 'bottom']} scroll={false}>
        <AppBar title="" closeIcon />
        <View style={styles.preparing}>
          <Text variant="heading" tone="white" center>
            Ouverture de la caméra…
          </Text>
        </View>
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen>
        <AppBar title="Scanner" closeIcon />
        <View style={styles.manual}>
          <Text variant="heading" center>
            Accès à la caméra
          </Text>
          <Text tone="secondary" center>
            L’accès est refusé. Vous pouvez l’autoriser ou saisir le code affiché sous le
            QR du client.
          </Text>
          {permission.canAskAgain ? (
            <Button
              label="Autoriser la caméra"
              onPress={() => void requestPermission()}
            />
          ) : null}
          <TextField
            label="Code client"
            value={manualCode}
            onChangeText={(value) => {
              setManualCode(value.toUpperCase());
              setError(undefined);
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={15}
            placeholder="WFY-XXXXX-XXXXX"
            error={error}
            returnKeyType="go"
            onSubmitEditing={submitManual}
          />
          <Button label="Ouvrir la fiche client" onPress={submitManual} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      background={colors.ink}
      edges={['top', 'bottom']}
      scroll={false}
      padded={false}
    >
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }) => onScan(data)}
      />
      <View style={styles.cameraShade} pointerEvents="none" />

      <View style={styles.scanHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fermer"
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <Text style={styles.headerIcon}>✕</Text>
        </Pressable>
        <View style={styles.headerActions}>
          <View style={styles.headerButton}>
            <Text style={styles.headerIcon}>⚡</Text>
          </View>
          <View style={styles.manualShortcut}>
            <Text style={styles.shortcutText}>Recherche manuelle</Text>
          </View>
        </View>
      </View>

      <View style={styles.scanArea}>
        <View style={styles.viewfinder}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
          <View style={styles.scanLine} />
        </View>
        <Text variant="heading" tone="white" center>
          Scannez le QR code du client
        </Text>
        <Text style={styles.hint} center>
          Le profil s’ouvre automatiquement dès la détection.
        </Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.manualPanel}>
          <TextField
            label="Ou entrez le code client"
            value={manualCode}
            onChangeText={(value) => {
              setManualCode(value.toUpperCase());
              setError(undefined);
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={15}
            placeholder="WFY-XXXXX-XXXXX"
            error={error}
            returnKeyType="go"
            onSubmitEditing={submitManual}
          />
          <Button label="Valider le code" size="md" onPress={submitManual} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: spacing.lg },
  manual: { gap: spacing.lg, marginTop: spacing.lg },
  preparing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cameraShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(11,15,22,0.62)' },
  scanHeader: {
    position: 'relative',
    paddingHorizontal: 22,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActions: { flexDirection: 'row', gap: 10 },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: { color: colors.white, fontSize: 17, lineHeight: 21 },
  manualShortcut: {
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutText: {
    color: colors.white,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Manrope_700Bold',
  },
  scanArea: {
    position: 'relative',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 30,
    paddingTop: 12,
  },
  viewfinder: { width: 248, height: 248, marginBottom: 14 },
  corner: { position: 'absolute', width: 54, height: 54, borderColor: colors.primary },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 18,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 18,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 18,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 18,
  },
  scanLine: {
    position: 'absolute',
    top: '50%',
    left: 14,
    right: 14,
    height: 3,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  footer: { position: 'relative', paddingHorizontal: 22, paddingBottom: 18 },
  hint: { color: '#93A1B3', fontSize: 13.5, lineHeight: 19 },
  manualPanel: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 20,
    backgroundColor: colors.white,
  },
});
