import { useRef, useState } from 'react';
import { Image } from 'expo-image';
import * as Print from 'expo-print';
import QRCode from 'react-native-qrcode-svg';
import { Platform, Share, StyleSheet, View } from 'react-native';

import { AppBar, Button, Card, Screen, Text } from '@/components/ui';
import { useMyMerchant } from '@/features/auth/hooks';
import {
  buildCounterPosterHtml,
  type CounterPosterFormat,
} from '@/features/merchant/counter-poster';
import { usePrograms } from '@/features/merchant/hooks';
import { env } from '@/lib/env';
import { encodeMerchantQr } from '@/lib/qr';
import { colors, spacing } from '@/theme';

type QrCodeHandle = {
  toDataURL: (callback: (data: string) => void) => void;
};

/**
 * QR d'inscription présenté par le commerçant, scanné par le client.
 *
 * C'est volontairement la seule action proposée au client non inscrit : le
 * commerçant ne peut pas créer une carte à sa place (décision D5).
 */
export default function EnrollQr() {
  const { data: merchant } = useMyMerchant();
  const programs = usePrograms();
  const qrRef = useRef<QrCodeHandle | null>(null);
  const [actionError, setActionError] = useState(false);
  const [printing, setPrinting] = useState<CounterPosterFormat | null>(null);

  if (!merchant) {
    return (
      <Screen>
        <AppBar title="QR d’inscription" closeIcon />
        <Card>
          <Text tone="secondary">Chargement du commerce…</Text>
        </Card>
      </Screen>
    );
  }

  const value = encodeMerchantQr(merchant.join_code, env.EXPO_PUBLIC_APP_URL);
  const primaryProgram = programs.data?.find((program) => program.status === 'active');

  const share = async () => {
    setActionError(false);
    try {
      await Share.share({
        title: `Carte de fidélité ${merchant.name}`,
        message: `Ajoutez la carte ${merchant.name} dans Waffiy : ${value}`,
      });
    } catch {
      setActionError(true);
    }
  };

  const qrDataUrl = () =>
    new Promise<string>((resolve, reject) => {
      if (!qrRef.current) {
        reject(new Error('QR_NOT_READY'));
        return;
      }
      qrRef.current.toDataURL((data) => resolve(`data:image/png;base64,${data}`));
    });

  const printPoster = async (format: CounterPosterFormat) => {
    setActionError(false);
    setPrinting(format);
    try {
      const html = buildCounterPosterHtml({
        format,
        merchantName: merchant.name,
        rewardName: primaryProgram?.name ?? 'Une récompense chez votre commerçant',
        threshold: primaryProgram?.threshold ?? 10,
        joinUrl: value,
        qrDataUrl: await qrDataUrl(),
        logoUrl: merchant.logo_url,
      });

      if (Platform.OS === 'web') {
        const frame = document.createElement('iframe');
        frame.style.position = 'fixed';
        frame.style.width = '1px';
        frame.style.height = '1px';
        frame.style.opacity = '0';
        frame.srcdoc = html;
        frame.onload = () => {
          frame.contentWindow?.focus();
          frame.contentWindow?.print();
          window.setTimeout(() => frame.remove(), 1000);
        };
        document.body.appendChild(frame);
      } else {
        await Print.printAsync({ html });
      }
    } catch {
      setActionError(true);
    } finally {
      setPrinting(null);
    }
  };

  return (
    <Screen>
      <View style={styles.content}>
        <AppBar eyebrow="Acquisition" title="" />
        <Text variant="title">Invitez vos clients</Text>

        <Card style={styles.qrCard}>
          {merchant.logo_url ? (
            <Image
              source={{ uri: merchant.logo_url }}
              style={styles.logo}
              contentFit="cover"
            />
          ) : null}
          <View
            style={styles.qr}
            accessibilityLabel={`QR d’inscription ${merchant.name}`}
          >
            <QRCode
              ref={(instance) => {
                qrRef.current = instance as unknown as QrCodeHandle;
              }}
              value={value}
              size={224}
              color={colors.ink}
              backgroundColor={colors.white}
            />
          </View>
          <Text style={styles.inviteText}>
            Scannez avec l’appareil photo pour rejoindre {merchant.name}.
          </Text>
          <Text style={styles.helpText}>
            {"QR d'inscription au commerce — différent du QR personnel de vos clients."}
          </Text>
        </Card>

        <View style={styles.actions}>
          <Button
            label="Imprimer l’affiche A5"
            loading={printing === 'A5'}
            loadingLabel="Préparation A5…"
            onPress={() => void printPoster('A5')}
            style={styles.printButton}
            trailing={<Text style={styles.whiteArrow}>↗</Text>}
          />
          <Button
            label="Imprimer l’affiche A4"
            variant="secondary"
            loading={printing === 'A4'}
            loadingLabel="Préparation A4…"
            onPress={() => void printPoster('A4')}
          />
          <Button
            label="Partager le lien"
            variant="secondary"
            onPress={() => void share()}
            trailing={<Text style={styles.grayArrow}>↗</Text>}
          />
          {actionError ? (
            <Text variant="caption" tone="danger" center>
              L’action n’a pas pu être ouverte. Réessayez dans un instant.
            </Text>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 14, gap: 20 },
  qrCard: {
    alignItems: 'center',
    borderRadius: 24,
    padding: 22,
    gap: 18,
  },
  logo: { width: 70, height: 70, borderRadius: 18, marginBottom: -4 },
  qr: {
    width: 250,
    height: 250,
    padding: 12,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 8,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteText: {
    color: colors.ink,
    fontFamily: 'Manrope_700Bold',
    fontSize: 15.5,
    lineHeight: 22,
    textAlign: 'center',
  },
  helpText: {
    color: colors.textMuted,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12.5,
    lineHeight: 19,
    textAlign: 'center',
  },
  actions: { gap: spacing.sm },
  printButton: { backgroundColor: colors.ink, borderColor: colors.ink },
  whiteArrow: { color: colors.white, fontSize: 17, lineHeight: 20 },
  grayArrow: { color: colors.textMuted, fontSize: 17, lineHeight: 20 },
});
