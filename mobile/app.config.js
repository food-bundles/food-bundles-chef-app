// Dynamic Expo config — reads env vars so the API URL is never hardcoded.
// EAS injects EXPO_PUBLIC_API_BASE_URL from the build environment at build time.
// For local dev, set it in your .env file.
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  expo: {
    name: 'Food Bundles Chef',
    slug: 'food-bundles-chef-app',
    version: '1.0.0',
    scheme: 'chef',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.foodbundles.chefapp',
    },
    newArchEnabled: true,
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#FFFFFF',
      },
      package: 'com.foodbundles.chefapp',
      // This file replaces app.json entirely, so the keyboard mode must live here.
      softwareKeyboardLayoutMode: 'resize',
      usesCleartextTraffic: true,
      permissions: [
        'android.permission.CAMERA',
        'android.permission.RECORD_AUDIO',
        'android.permission.MODIFY_AUDIO_SETTINGS',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.FOREGROUND_SERVICE',
        'android.permission.FOREGROUND_SERVICE_LOCATION',
      ],
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      [
        'expo-camera',
        {
          cameraPermission:
            'Allow Food Bundles Chef to access your camera to photograph deliveries.',
        },
      ],
      [
        'expo-splash-screen',
        {
          image: './assets/splash.png',
          resizeMode: 'contain',
          imageWidth: 200,
          backgroundColor: '#FFFFFF',
          dark: { image: './assets/splash.png', backgroundColor: '#0B0F0C' },
        },
      ],
      'expo-sqlite',
      [
        'expo-image-picker',
        {
          photosPermission:
            'Allow Food Bundles Chef to access your photos to set a kitchen photo.',
          cameraPermission: 'Allow Food Bundles Chef to take a kitchen photo.',
        },
      ],
      './plugins/withExpoModulesProguard',
      'expo-sharing',
      [
        'expo-audio',
        {
          microphonePermission:
            'Allow Food Bundles Chef to use the microphone so you can talk to the kitchen assistant instead of typing.',
        },
      ],
      'expo-localization',
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'Allow Food Bundles Chef to access your location to tag delivery locations and track routes.',
          locationWhenInUsePermission:
            'Allow Food Bundles Chef to access your location to tag delivery locations.',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {
        asyncRoutes: {
          web: true,
        },
      },
      eas: {
        projectId: '3ca32611-ff5e-4de8-880a-9997eed4d3a3',
      },
      // Injected from EXPO_PUBLIC_API_BASE_URL at build time — never hardcode a URL here.
      apiBaseUrl,
      // Shown in the one-time AI privacy notice; the link is hidden when empty.
      privacyPolicyUrl: process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? '',
    },
    owner: 'aguramarket',
  },
};
