export async function googleSignIn() {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId) throw new Error('GoogleログインのクライアントIDが未設定です。ログインせず利用できます。');
  // Lazy import keeps guest mode working in Expo Go / unsupported native builds.
  const { GoogleOneTapSignIn } = await import('react-native-nitro-google-signin').catch(() => {
    throw new Error('Google認証には新しいネイティブビルドが必要です。Expo Goではログインせず利用してください。');
  });
  GoogleOneTapSignIn.configure({ webClientId, iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID });
  await GoogleOneTapSignIn.checkPlayServices();
  const result = await GoogleOneTapSignIn.presentExplicitSignIn();
  if (result.type !== 'success' || !result.data) return undefined;
  if (!result.data.idToken) throw new Error('Googleの本人確認に失敗しました。');
  return { idToken: result.data.idToken, name: result.data.user.name ?? 'トレーニー' };
}
