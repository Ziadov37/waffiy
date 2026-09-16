import { useRef, useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppBar, Button, Screen, Text, TextField } from '@/components/ui';
import { parseScannedCode } from '@/lib/qr';
import { colors, radius, spacing } from '@/theme';

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
  const [manual, setManual] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState<string>();
  const handled = useRef(false);

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

  if (manual || permission?.granted === false) {
    return (
      <Screen>
        <AppBar title="Recherche manuelle" closeIcon />
        <View style={styles.manual}>
          {permission?.granted === false ? (
            <Text tone="secondary">
              L’accès à la caméra est refusé. Saisissez le code affiché sous le QR du client,
              ou autorisez la caméra.
            </Text>
          ) : (
            <Text tone="secondary">
              Saisissez le code affiché sous le QR code du client, au format WFY-XXXXX-XXXXX.
            </Text>
          )}

          <TextField
            label="Code client"
            value={manualCode}
            onChangeText={(v) => {
              setManualCode(v.toUpperCase());
              setError(undefined);
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="WFY-XXXXX-XXXXX"
            error={error}
            autoFocus
          />

          <Button label="Ouvrir la fiche" onPress={submitManual} />

          {permission?.granted === false ? (
            <Button
              label="Autoriser la caméra"
              variant="secondary"
              onPress={() => void requestPermission()}
            />
          ) : (
            <Button
              label="Revenir au scan"
              variant="ghost"
              onPress={() => {
                setManual(false);
                setError(undefined);
              }}
            />
          )}
        </View>
      </Screen>
    );
  }

  if (!permission) {
    return (
      <Screen>
        <AppBar title="Scanner" closeIcon />
        <Text tone="secondary">Préparation de la caméra…</Text>
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
            Waffiy a besoin de la caméra pour lire le QR code de vos clients.
          </Text>
          <Button label="Autoriser la caméra" onPress={() => void requestPermission()} />
          <Button
            label="Saisir le code à la main"
            variant="ghost"
            onPress={() => setManual(true)}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen background={colors.ink} edges={['top', 'bottom']} scroll={false} padded={false}>
      <View style={styles.bar}>
        <AppBar title="" closeIcon />
      </View>

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
          Scannez le QR code du client
        </Text>
        <Text style={styles.hint} center>
          {error ?? 'La fiche s’ouvre automatiquement dès la détection.'}
        </Text>
        <Button
          label="Recherche manuelle"
          variant="ghost"
          style={styles.manualButton}
          onPress={() => setManual(true)}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: spacing.lg },
  manual: { gap: spacing.lg, marginTop: spacing.lg },
  viewfinder: {
    flex: 1,
    margin: spacing.lg,
    borderRadius: radius.xxl,
    overflow: 'hidden',
    backgroundColor: '#000',
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
  manualButton: { borderColor: 'rgba(255,255,255,0.3)', borderWidth: 1, marginTop: spacing.sm },
});
