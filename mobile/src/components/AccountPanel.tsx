import { LegalLinks } from './LegalLinks';
import React, { useState } from 'react';
import { Alert, Text } from 'react-native';
import { useApp } from '../context';
import { BeginnerGuide } from './BeginnerGuide';
import { Button, Card, Field, SectionTitle, useTheme } from '../ui';

function confirm(message: string) {
  return new Promise<boolean>((resolve) => Alert.alert('記録を確認', message, [
    { text: '追加しない', style: 'cancel', onPress: () => resolve(false) },
    { text: '端末の記録も追加', onPress: () => resolve(true) },
  ], { cancelable: false }));
}

export function AccountPanel({ onboarding = false }: { onboarding?: boolean }) {
  const { state, cloudBusy, syncError, login, logout, deleteCloudAccount, syncNow, restoreGuest, update } = useApp();
  const { styles } = useTheme();
  const [showDemo, setShowDemo] = useState(false);
  const [demoLogin, setDemoLogin] = useState('');
  const [demoPassword, setDemoPassword] = useState('');
  const [error, setError] = useState<string>();
  const run = (work: () => Promise<unknown>) => {
    setError(undefined);
    void work().catch((e: unknown) => setError(e instanceof Error ? e.message : '操作できませんでした'));
  };
  return <Card>
    {onboarding && <BeginnerGuide />}
    <SectionTitle>{onboarding ? '記録を始めましょう' : 'アカウント・同期'}</SectionTitle>
    <Text style={styles.body}>{state.cloud ? `${state.cloud.identity.name}でログイン中` : onboarding ? '端末だけで記録できます。Googleログインすると別の端末にも記録を同期できます。' : 'Googleログインすると、記録をアカウントに保存できます。'}</Text>
    <Text style={styles.small}>ログインすると記録・日付・種目・プリセット・体組成・設定をアプリのサーバーへ保存します。Google Driveには保存しません。ルームごとの同意後、その月の1日以降の完了記録の種目・重量・回数・日時を友だちへ自動共有します。同意していないルームへは自動共有しません。</Text>
    {!!state.cloud && <Text style={styles.small}>未送信 {state.cloud.pending.length}件 · 最終同期 {state.cloud.lastSynced ? new Date(state.cloud.lastSynced).toLocaleString() : 'まだ完了していません'}</Text>}
    {(error || syncError) && <Text accessibilityRole="alert" style={styles.small}>{error ?? syncError}</Text>}
    {!cloudBusy && <Button label={state.cloud ? 'Googleで再ログイン' : 'Googleでログイン'} onPress={() => run(() => login(confirm))} />}
    {!state.cloud && !cloudBusy && <Button secondary label="審査用デモログイン" onPress={() => setShowDemo(!showDemo)} />}
    {!state.cloud && showDemo && !cloudBusy && <>
      <Text style={styles.small}>審査用の共有デモアカウントです。個人の記録・健康情報は入力しないでください。通常の同期・ルーム・削除機能を確認できます。</Text>
      <Field label="デモ用ID" value={demoLogin} onChangeText={setDemoLogin} maxLength={80} />
      <Field label="デモ用パスワード" value={demoPassword} onChangeText={setDemoPassword} secureTextEntry maxLength={128} />
      <Button label="デモにログイン" onPress={() => run(async () => {
        const credentials = { login: demoLogin.trim(), password: demoPassword };
        // Keep personal guest records out of the shared review account.
        if (await login(async () => false, credentials)) { setDemoPassword(''); setShowDemo(false); }
      })} />
    </>}
    {!state.cloud && !cloudBusy && <Button secondary label="ログイン前の保管データを戻す" onPress={() => Alert.alert('端末の保管データを戻す', '現在のゲスト記録と保管データを入れ替えます。サーバーへは送信しません。', [
      { text: 'キャンセル', style: 'cancel' }, { text: '入れ替える', onPress: () => run(restoreGuest) },
    ])} />}
    {!state.cloud && onboarding && !cloudBusy && <Button secondary label="ログインせずに使う" onPress={() => update(s => ({ ...s, loginPromptDismissed: true }))} />}
    {state.cloud && !cloudBusy && <>
      <Button secondary label="今すぐ同期" onPress={() => run(syncNow)} />
      <Button secondary label="ログアウト・別アカウントに切替" onPress={() => Alert.alert('ログアウト', '未送信があれば完了するまで切替できません。元の記録は分離して保持し、ログインするまで表示しません。', [
        { text: 'キャンセル', style: 'cancel' }, { text: 'ログアウト', onPress: () => run(logout) },
      ])} />
      <Button secondary label="アカウントを削除" onPress={() => Alert.alert('アカウントを削除しますか？', '本人のクラウド記録・共有投稿を削除します。作成したルームは残るメンバーへ引継ぎます。この端末の個人記録はログインなしで残ります。削除は取り消せません。', [
        { text: 'キャンセル', style: 'cancel' }, { text: '削除する', style: 'destructive', onPress: () => run(deleteCloudAccount) },
      ])} />
    </>}
    <LegalLinks />
    {cloudBusy && <Text style={styles.body}>アカウント処理中…</Text>}
  </Card>;
}
