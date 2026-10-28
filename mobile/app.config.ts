import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  return {
    ...config,
    name: config.name ?? 'FitSwipe',
    slug: config.slug ?? 'fitlog-solo',
    plugins: [
      ...(config.plugins ?? []),
      // Android uses an explicit webClientId (no google-services.json).
      // The library autolinks its Credential Manager dependencies. Its Expo
      // plugin is needed for the iOS redirect scheme / Pod configuration.
      ...(iosClientId ? [[ 'react-native-nitro-google-signin', {
        iosUrlScheme: iosClientId.split('.').reverse().join('.'),
      }] as [string, Record<string, string>]] : []),
    ],
  };
};
