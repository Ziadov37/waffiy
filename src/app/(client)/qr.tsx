import { useEffect, useState } from 'react';
import * as Brightness from 'expo-brightness';
import { useRouter } from 'expo-router';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Button, Icon, Screen, Text } from '@/components/ui';
import { useProfile } from '@/features/auth/hooks';
import { formatPublicCode, fullName } from '@/lib/format';
import { encodeClientQr } from '@/lib/qr';
import { colors, fontFamily, spacing } from '@/theme';

const QR_SIZE = Math.min(Dimensions.get('window').width - 100, 268);

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
    <Screen background={colors.white} edges={['top', 'bottom']} scroll={false}>
      <View style={styles.header}>
        <View style={styles.brand}>
          <View style={styles.brandIcon}>
            <Icon name="qr" size={20} color={colors.primaryDark} />
          </View>
          <Text style={styles.brandName}>Mon QR Waffiy</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fermer"
          style={styles.close}
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace('/(client)/(tabs)')
          }
        >
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.intro}>
          <Text style={styles.instruction}>Mon QR personnel</Text>
          <Text style={styles.description}>
            Ce code unique fonctionne dans tous les commerces Waffiy.
          </Text>
        </View>

        <View style={styles.qrCard}>
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

        {profile ? (
          <View style={styles.identity}>
            <Text style={styles.profileName}>
              {profile.first_name
                ? fullName(profile.first_name, profile.last_name)
                : 'Client Waffiy'}
            </Text>
            <Text style={styles.publicCode}>{formatPublicCode(profile.public_code)}</Text>
          </View>
        ) : null}

        <View style={styles.bottom}>
          <Text style={styles.note}>
            {brightnessNote ??
              "La luminosité augmente automatiquement à l'ouverture de cet écran."}
          </Text>
          <Button
            label="Augmenter la luminosité"
            onPress={() => void Brightness.setBrightnessAsync(1)}
            style={styles.brightnessButton}
            trailing={<Text style={styles.sun}>☀</Text>}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  brandIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primarySurface,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    color: colors.ink,
    fontFamily: fontFamily.extrabold,
    fontSize: 15,
    lineHeight: 20,
  },
  close: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: colors.textSecondary, fontSize: 16, lineHeight: 20 },
  body: { flex: 1 },
  intro: { marginTop: 44, gap: 5 },
  instruction: {
    color: colors.ink,
    fontFamily: fontFamily.extrabold,
    fontSize: 19,
    lineHeight: 26,
    letterSpacing: -0.38,
  },
  description: {
    color: colors.textSecondary,
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    lineHeight: 19,
  },
  qrCard: {
    width: 300,
    height: 300,
    padding: 14,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 8,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
  },
  qrPlaceholder: { backgroundColor: colors.surfaceMuted, borderRadius: 8 },
  identity: { gap: spacing.xs, marginTop: 28 },
  profileName: {
    color: colors.ink,
    fontFamily: fontFamily.extrabold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.55,
  },
  publicCode: {
    color: colors.textMuted,
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.78,
  },
  bottom: { marginTop: 'auto', gap: 10, paddingBottom: 4 },
  note: { color: colors.textMuted, fontSize: 12.5, lineHeight: 18 },
  brightnessButton: { backgroundColor: colors.ink, borderColor: colors.ink },
  sun: { color: colors.white, fontSize: 17, lineHeight: 20 },
});
