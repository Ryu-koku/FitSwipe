import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const development = process.env.FITSWIPE_APP_VARIANT === 'development';
  const versionCode = Number(process.env.FITLOG_VERSION_CODE ?? config.android?.versionCode ?? 37);

  if (!Number.isSafeInteger(versionCode) || versionCode < 1) {
    throw new Error('FITLOG_VERSION_CODE must be a positive integer');
  }

  return {
    ...config,
    name: development ? 'FitSwipe Dev' : config.name ?? 'FitSwipe',
    slug: config.slug ?? 'fitlog-solo',
    android: {
      ...config.android,
      package: development ? 'dev.local.fitlogsolo.expodev' : config.android?.package ?? 'dev.local.fitlogsolo',
      versionCode,
    },
    ios: {
      ...config.ios,
      bundleIdentifier: development ? 'dev.local.fitlogsolo.expodev' : config.ios?.bundleIdentifier ?? 'dev.local.fitlogsolo',
    },
    plugins: [
      ...(config.plugins ?? []),
      './plugins/with-play-upload-signing',
      // Android uses an explicit webClientId (no google-services.json).
      // The library autolinks its Credential Manager dependencies. Its Expo
      // plugin is needed for the iOS redirect scheme / Pod configuration.
      ...(iosClientId ? [[ 'react-native-nitro-google-signin', {
        iosUrlScheme: iosClientId.split('.').reverse().join('.'),
      }] as [string, Record<string, string>]] : []),
    ],
  };
};
