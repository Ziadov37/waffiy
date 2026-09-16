import { useEffect, useState } from 'react';
import * as Brightness from 'expo-brightness';
import { useRouter } from 'expo-router';
import { Dimensions, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { AppBar, Card, Screen, Text } from '@/components/ui';
import { useProfile } from '@/features/auth/hooks';
import { formatPublicCode, fullName } from '@/lib/format';
import { encodeClientQr } from '@/lib/qr';
import { colors, spacing } from '@/theme';

const QR_SIZE = Math.min(Dimensions.get('window').width - 96, 280);

/**
 * QR personnel du client, en plein écran.
 *
 * Le QR ne contient que le code aléatoire (décision D3) : ni nom, ni
 * identifiant séquentiel. Le nom affiché sous le code sert au commerçant à
 * vérifier de visu qu'il scanne la bonne personne — mais il n'est pas dans
 * les données encodées.
 */
export default function ClientQr() {
  const { data: profile } = useProfile();
  const router = useRouter();
  const [brightnessNote, setBrightnessNote] = useState<string>();

  // La luminosité est remontée au maximum puis restaurée à la sortie : un
  // écran en mode économie d'énergie, derrière une vitre de comptoir, est
  // illisible pour une caméra.
  useEffect(() => {
    let previous: number | null = null;
    let cancelled = false;

    void (async () => {
      try {
        const { granted } = await Brightness.requestPermissionsAsync();
        if (!granted || cancelled) {
          setBrightnessNote('Augmentez la luminosité si le scan échoue.');
          return;
        }
        previous = await Brightness.getBrightnessAsync();
        await Brightness.setBrightnessAsync(1);
      } catch {
        setBrightnessNote('Augmentez la luminosité si le scan échoue.');
      }
    })();

    return () => {
      cancelled = true;
      if (previous !== null) void Brightness.setBrightnessAsync(previous);
    };
  }, []);

  return (
    <Screen background={colors.white} edges={['top', 'bottom']}>
      <AppBar
        title="Mon QR code"
        closeIcon
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(client)'))}
      />

      <View style={styles.body}>
        <Text tone="secondary" center>
          Présentez ce QR code au commerçant
        </Text>

        <Card padded={false} style={styles.qrCard}>
          <View style={styles.qrInner}>
            {profile ? (
              <QRCode
                value={encodeClientQr(profile.public_code)}
                size={QR_SIZE}
                color={colors.ink}
                backgroundColor={colors.white}
                // Correction d'erreur moyenne : le code reste lisible même
                // partiellement masqué par un reflet ou une trace de doigt.
                ecl="M"
              />
            ) : (
              <View style={[styles.qrPlaceholder, { width: QR_SIZE, height: QR_SIZE }]} />
            )}
          </View>
        </Card>

        {profile ? (
          <View style={styles.identity}>
            <Text variant="subheading" center>
              {fullName(profile.first_name, profile.last_name)}
            </Text>
            <Text variant="label" tone="tertiary" center>
              {formatPublicCode(profile.public_code)}
            </Text>
          </View>
        ) : null}

        <Text variant="caption" tone="tertiary" center style={styles.note}>
          {brightnessNote ??
            'La luminosité de votre écran est augmentée automatiquement sur cet écran.'}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xl },
  qrCard: { padding: spacing.xl, backgroundColor: colors.white },
  qrInner: { padding: spacing.lg },
  qrPlaceholder: { backgroundColor: colors.surfaceMuted, borderRadius: 8 },
  identity: { gap: spacing.xs },
  note: { paddingHorizontal: spacing.xl },
});
