import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useApp } from '../context';
import { Button, Card, Field, Sheet, useTheme } from '../ui';
import { MemberAvatar } from './RoomComparisonChart';
import { MAX_AVATAR_LENGTH, validateProfile } from '../profile';

export function ProfileEditor() {
  const { state, cloudBusy, updateProfile } = useApp();
  const account = state.cloud?.identity ?? state.roomIdentity;
  const { styles } = useTheme();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const run = async (work: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await work(); }
    catch (e) { setError(e instanceof Error ? e.message : '保存できませんでした。もう一度お試しください。'); }
    finally { lock.current = false; setBusy(false); }
  };
  const pick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 });
    if (result.canceled) return;
    const image = result.assets[0];
    const side = Math.min(image.width, image.height);
    const context = ImageManipulator.manipulate(image.uri);
    let rendered;
    try {
      context.crop({ originX: Math.floor((image.width - side) / 2), originY: Math.floor((image.height - side) / 2), width: side, height: side });
      context.resize({ width: 128, height: 128 });
      rendered = await context.renderAsync();
      const output = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.65, base64: true });
      if (!output.base64) throw new Error('画像を読み込めませんでした。');
      const uri = `data:image/jpeg;base64,${output.base64}`;
      if (uri.length > MAX_AVATAR_LENGTH) throw new Error('画像が大きすぎます。別の画像を選んでください。');
      setAvatar(uri);
    } finally { rendered?.release(); context.release(); }
  };
  return <>
    <Card>
      <View style={[styles.row, { justifyContent: 'flex-start', gap: 16 }]}>
        <MemberAvatar name={account?.name ?? ''} avatar={account?.avatar} size={64} />
        <View style={{ flex: 1 }}><Text style={styles.small}>プロフィール</Text><Text style={styles.title}>{account?.name ?? '未設定'}</Text></View>
      </View>
      <Button label="アイコン・表示名を変更" secondary disabled={cloudBusy} onPress={() => {
        setName(account?.name ?? ''); setAvatar(account?.avatar ?? null); setError(''); setNotice(''); setEditing(true);
      }} />
      {!!notice && <Text accessibilityLiveRegion="polite" style={styles.small}>{notice}</Text>}
    </Card>
    {editing && <Sheet title="プロフィールを編集" onClose={() => { if (!lock.current) setEditing(false); }}>
      <View style={{ alignItems: 'center', marginVertical: 16 }}><MemberAvatar name={name} avatar={avatar} size={88} /></View>
      <Button label={busy ? '処理中…' : '写真からアイコンを選ぶ'} secondary disabled={busy || cloudBusy} onPress={() => void run(pick)} />
      {avatar && <Button label="アイコンを削除して頭文字に戻す" secondary disabled={busy || cloudBusy} onPress={() => setAvatar(null)} />}
      <Field label="表示名（1〜32文字）" value={name} onChangeText={value => { if (!busy && !cloudBusy) setName(value); }} maxLength={32} />
      <Text style={styles.small}>表示名とアイコンは、参加しているルームのメンバーにも表示されます。保存にはインターネット接続が必要です。</Text>
      {!account && <Text style={styles.small}>保存すると、このプロフィールでルーム用アカウントを作成します。</Text>}
      {!!error && <Text accessibilityRole="alert" style={styles.body}>{error}</Text>}
      <Button label={busy ? '処理中…' : '保存'} disabled={busy || cloudBusy || !name.trim()} onPress={() => void run(async () => {
        const profile = validateProfile(name, avatar);
        await updateProfile(profile.name, profile.avatar);
        setEditing(false); setNotice('プロフィールを保存しました。');
      })} />
      <Button label="キャンセル" secondary disabled={busy || cloudBusy} onPress={() => setEditing(false)} />
    </Sheet>}
  </>;
}
