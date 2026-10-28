import React, { useRef } from 'react';
import { Platform, Share, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../context';
import { Button, Card, Screen, useTheme } from '../ui';
import { captureRef } from 'react-native-view-shot';

export default function CompleteScreen() {
  const { state } = useApp();
  const { colors, styles } = useTheme();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const session = state.sessions.find((s) => s.id === Number(sessionId));
  const sets = state.sets.filter(
    (s) => s.sessionId === session?.id && s.isCompleted,
  );
  const starts = sets.map((s) =>
    new Date(s.createdAt ?? session!.startedAt).getTime(),
  );
  const ends = sets.map((s) =>
    new Date(s.updatedAt ?? session!.endedAt ?? session!.startedAt).getTime(),
  );
  const minutes = sets.length
    ? Math.max(1, Math.floor((Math.max(...ends) - Math.min(...starts)) / 60000))
    : 0;
  const cardRef = useRef<any>(null);
  const shareImage = async () => {
    if (!cardRef.current) return;
    const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
    if (Platform.OS === 'ios') await Share.share({ url: uri, title: 'FitSwipe トレーニング記録' });
    else await Share.share({ message: `FitSwipe｜${new Date(session!.startedAt).toLocaleDateString()}\n${new Set(sets.map(s => s.exerciseId)).size}種目・${sets.length}セット・${minutes}分\n\n${sets.map(set => `${state.exercises.find(e => e.id === set.exerciseId)?.name ?? '種目'} ${set.normalWeightKg ?? set.leftWeightKg ?? 0}kg × ${set.normalReps ?? set.leftReps ?? 0}回`).join('\n')}` });
  };
  return (
    <Screen title="完了">
      <View style={{ alignItems: 'center', paddingTop: 36 }}>
        <View
          style={{
            borderRadius: 56,
            backgroundColor: colors.primary,
            height: 112,
            width: 112,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 60, color: colors.bg }}>✓</Text>
        </View>
        <Text style={[styles.title, { marginVertical: 24 }]}>
          おつかれさま！
        </Text>
      </View>
      <View ref={cardRef} collapsable={false} style={{ backgroundColor: colors.primary, borderRadius: 20, padding: 22, marginBottom: 14 }}>
        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>FIT SWIPE  ·  WORKOUT</Text>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 12 }}>{session ? new Date(session.startedAt).toLocaleDateString() : ''}</Text>
        <Text style={{ color: '#fff', fontSize: 17, marginTop: 8 }}>{new Set(sets.map(s => s.exerciseId)).size} 種目　{sets.length} セット　{minutes} 分</Text>
        {sets.slice(0, 6).map(set => <Text key={set.id} style={{ color: '#fff', marginTop: 4 }}>{state.exercises.find(e => e.id === set.exerciseId)?.name ?? '種目'}　{set.normalWeightKg ?? set.leftWeightKg ?? 0}kg × {set.normalReps ?? set.leftReps ?? 0}</Text>)}
      </View>
      <View style={[styles.row, { marginBottom: 16 }]}>
        {[
          [new Set(sets.map((s) => s.exerciseId)).size, '種目'],
          [sets.length, 'セット'],
          [minutes, '分'],
        ].map(([value, label]) => (
          <Card key={label} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.metric}>{value}</Text>
            <Text style={styles.small}>{label}</Text>
          </Card>
        ))}
      </View>
      <Button label="ホームに戻る" onPress={() => router.replace('/')} />
      <Button label={Platform.OS === 'ios' ? 'トレーニングカードを画像共有' : 'トレーニング記録を共有'} secondary disabled={!session} onPress={() => void shareImage()} />
      <Button
        label="ルームの比較を見る"
        secondary
        disabled={!session}
        onPress={() =>
          router.push('/rooms')
        }
      />
    </Screen>
  );
}
