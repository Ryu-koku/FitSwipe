import { Alert } from 'react-native';
import * as Linking from 'expo-linking';
import { createRoomsClient } from './rooms';
import { legalUrls, TERMS_VERSION } from './legal';
import type { RoomIdentity } from './types';

export async function openLegalUrl(url: string) {
  try { await Linking.openURL(url); }
  catch { Alert.alert('ページを開けませんでした', '通信状況を確認して、もう一度お試しください。'); }
}
export function confirmCommunityTerms(): Promise<boolean> {
  return new Promise(resolve => Alert.alert('利用規約・プライバシーの確認',
    'アカウント情報と、ログイン中の記録・体組成をサーバーに保存します。プロフィールと共有した記録はルームの仲間に表示されます。嫌がらせ・性的な内容・個人情報の無断公開等は禁止です。利用規約とプライバシーポリシーを確認し、同意しますか？', [
      { text: 'キャンセル', style: 'cancel', onPress: () => resolve(false) },
      { text: '規約・方針を読む', onPress: () => { void openLegalUrl(legalUrls.terms).then(() => resolve(false)); } },
      { text: '同意する', onPress: () => resolve(true) },
    ], { cancelable: false }));
}
export async function ensureCommunityTerms(identity: RoomIdentity) {
  const client = createRoomsClient();
  const status = await client.safety(identity);
  if (status.termsVersion !== TERMS_VERSION) throw new Error('利用規約が更新されました。アプリを更新してください。');
  if (status.accepted) return;
  if (!await confirmCommunityTerms()) throw new Error('送信するには利用規約への同意が必要です。');
  await client.acceptTerms(identity, TERMS_VERSION);
}
