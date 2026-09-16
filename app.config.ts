import type { ExpoConfig } from 'expo/config';

/**
 * Configuration de l'application Waffiy.
 *
 * Aucune clé secrète ici. Seules les variables EXPO_PUBLIC_* sont injectées
 * dans le bundle, et elles sont publiques par construction : la clé anonyme
 * Supabase est conçue pour être exposée, c'est la RLS qui protège les données.
 * La clé de service ne vit que dans les secrets des Edge Functions.
 */
const config: ExpoConfig = {
  name: 'Waffiy',
  slug: 'waffiy',
  version: '0.1.0',
  orientation: 'portrait',
  // Doit correspondre à site_url dans supabase/config.toml.
  scheme: 'waffiy',
  // L'interface est conçue en clair : forcer le thème évite qu'un appareil en
  // mode sombre rende illisibles les surfaces pastel des cartes de fidélité.
  userInterfaceStyle: 'light',
  icon: './assets/images/icon.png',

  ios: {
    supportsTablet: false,
    bundleIdentifier: 'dz.waffiy.app',
    infoPlist: {
      NSCameraUsageDescription:
        'Waffiy utilise la caméra pour scanner les QR codes de fidélité.',
      NSPhotoLibraryUsageDescription:
        'Waffiy accède à vos photos pour définir le logo de votre commerce.',
    },
  },

  android: {
    package: 'dz.waffiy.app',
    adaptiveIcon: {
      backgroundColor: '#16A36A',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    permissions: ['android.permission.CAMERA'],
  },

  web: { output: 'static', favicon: './assets/images/favicon.png' },

  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#16A36A',
        image: './assets/images/splash-icon.png',
        imageWidth: 96,
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission:
          'Waffiy utilise la caméra pour scanner les QR codes de fidélité.',
        recordAudioAndroid: false,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'Waffiy accède à vos photos pour définir le logo de votre commerce.',
      },
    ],
    [
      'expo-notifications',
      {
        color: '#16A36A',
        defaultChannel: 'default',
      },
    ],
  ],

  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
