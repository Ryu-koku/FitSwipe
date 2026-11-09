import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useApp } from '../context';
import { sharingSummary } from '../automatic-sharing';
import type { Room } from '../types';
import { Button, Card, useTheme } from '../ui';

export function RoomSharingPanel({ room, busy, onStart, onRetry }: {
  room: Room; busy: boolean; onStart: () => void; onRetry: () => void;
}) {
  const { state } = useApp();
  const { styles, colors } = useTheme();
  const [viewOnly, setViewOnly] = useState(false);
  const { pending, status } = sharingSummary(state, room);
  if (!room.sharingSince) return <Card>
    <Text style={[styles.body, { fontWeight: '700' }]}>自動共有はOFFです</Text>
    {!viewOnly && <Text style={styles.small}>共有範囲を確認して、仲間に記録を見せられます。共有せずに閲覧だけでも参加できます。</Text>}
    <Button label="共有範囲を確認して始める" secondary={viewOnly} disabled={busy} onPress={onStart} />
    {!viewOnly && <Button label="今は見るだけ" secondary onPress={() => setViewOnly(true)} />}
  </Card>;
  const problems = status?.issues ?? [];
  const needsAttention = pending > 0 || problems.length > 0;
  return <Card>
    <Text style={[styles.body, { fontWeight: '700' }]}>自動共有ON · 種目・重量・回数・日時を共有</Text>
    <Text accessibilityRole={needsAttention ? 'alert' : undefined} style={styles.small}>
      {needsAttention ? `共有待ち ${pending}記録${problems.length ? ` · 要確認 ${problems.length}件` : ''}`
        : status ? '確認時点の共有対象は反映済みです' : '共有状態を確認しています'}
    </Text>
    {status && <Text style={styles.small}>共有確認：{new Date(status.checkedAt).toLocaleString('ja-JP')}</Text>}
    {status?.limit !== undefined && status.used !== undefined && <Text style={[styles.small, status.used >= status.limit * 0.8 && { color: colors.orange }]}>
      あなたの自動共有 {status.used.toLocaleString()} / {status.limit.toLocaleString()}件
      {status.used >= status.limit * 0.8 ? ' · 残り容量が少なくなっています' : ''}
    </Text>}
    {status?.limit !== undefined && status.used !== undefined && status.used >= status.limit &&
      <Text style={styles.small}>古い共有が保存期限を迎えると空きが増えます。自動共有を停止することもできます。個人記録の削除は不要です。</Text>}
    {problems.map((issue, index) => <View key={`${issue.clientId ?? 'room'}-${index}`} style={{ marginTop: 8 }}>
      <Text style={styles.body}>{issue.label}</Text>
      <Text style={styles.small}>{issue.message}</Text>
      <Text style={styles.small}>{issue.retryable ? '未送信の変更を保持しています。通信回復・上限解消後に再試行します。' : '記録の内容や共有設定を確認してください。'}</Text>
    </View>)}
    {needsAttention && <Button label="このルームの共有を再試行" secondary disabled={busy} onPress={onRetry} />}
  </Card>;
}
