import React, { useRef, useState } from 'react';
import { Alert, Image, Modal, Platform, Pressable, Share, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context';
import { Button, Card, Screen, useTheme } from '../ui';
import { captureRef } from 'react-native-view-shot';
import { reopenSkippedCard } from '../workout';
import { SessionDetails } from '../components/SessionDetails';
import { completedSessions, estimatedOneRepMax, formatWeight } from '../logic';

import { CompletionCelebration } from '../components/CompletionCelebration';
import { SessionVolumeChart } from '../components/SessionVolumeChart';
import { sessionVolumes } from '../session-volume';

type ShareKind = 'activity' | 'overlay' | 'story';

export default function CompleteScreen() {
  const { state, update } = useApp();
  const { colors, styles } = useTheme();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const session = state.sessions.find((s) => s.id === Number(sessionId));
  const [celebrationDone, setCelebrationDone] = useState<number>();
  const finalSkip = state.sets.find((set) => set.sessionId === session?.id && set.finalSkippedSide && set.skippedInputs?.[set.finalSkippedSide]);
  const sets = state.sets.filter((s) => s.sessionId === session?.id && s.isCompleted);
  const starts = sets.map((s) => new Date(s.createdAt ?? session?.startedAt ?? '1970-01-01').getTime());
  const ends = sets.map((s) => new Date(s.updatedAt ?? session?.endedAt ?? session?.startedAt ?? '1970-01-01').getTime());
  const minutes = sets.length ? Math.max(1, Math.floor((Math.max(...ends) - Math.min(...starts)) / 60000)) : 0;
  const [sheet, setSheet] = useState(false);
  const [kind, setKind] = useState<ShareKind>('activity');
  const [photo, setPhoto] = useState<string | null>(null);
  const cardRef = useRef<any>(null);
  const storyRef = useRef<any>(null);
  const overlayRef = useRef<any>(null);
  const exerciseCount = new Set(sets.map((s) => s.exerciseId)).size;
  const date = session ? new Date(session.startedAt).toLocaleDateString() : '';
  const exerciseName = (id: number) => state.exercises.find((e) => e.id === id)?.name ?? '種目';
  const actualHighlight = [...new Set(sets.map((set) => set.exerciseId))].flatMap((id) => {
    const exercise = state.exercises.find((item) => item.id === id);
    const previous = completedSessions(state)
      .filter((item) => session && item.id !== session.id && item.startedAt < session.startedAt &&
        state.sets.some((set) => set.sessionId === item.id && set.exerciseId === id && set.isCompleted))
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
    if (!previous) return [];
    return (exercise?.mode === 'BILATERAL' ? ['left', 'right'] as const : ['normal'] as const).flatMap((side) => {
      const best = (rows: typeof sets) => Math.max(0, ...rows.map((set) =>
        estimatedOneRepMax(set[`${side}WeightKg`] ?? 0, set[`${side}Reps`] ?? 0) ?? 0));
      const before = best(state.sets.filter((set) => set.sessionId === previous.id && set.exerciseId === id && set.isCompleted));
      const after = best(sets.filter((set) => set.exerciseId === id));
      if (!before || after <= before) return [];
      return [{ id, side, before, after, gain: (after - before) / before }];
    });
  }).sort((a, b) => b.gain - a.gain)[0];
  const highlight = actualHighlight;
  const stats = <>
    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>FIT SWIPE  ·  WORKOUT</Text>
    <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 12 }}>{date}</Text>
    <Text style={{ color: '#fff', fontSize: 17, marginTop: 8 }}>{exerciseCount} 種目　{sets.length} セット　{minutes} 分</Text>
    {sets.slice(0, 6).map((set) => <Text key={set.id} style={{ color: '#fff', marginTop: 4 }}>{exerciseName(set.exerciseId)}　{set.normalWeightKg ?? set.leftWeightKg ?? 0}kg × {set.normalReps ?? set.leftReps ?? 0}</Text>)}
  </>;
  const selectPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (!result.canceled) { setPhoto(result.assets[0].uri); setKind('overlay'); }
  };
  const sendImage = async (ref: React.RefObject<any>, title: string) => {
    try {
      if (!ref.current) return;
      const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
      await Share.share(Platform.OS === 'ios' ? { url: uri, title } : { message: `${title}\n${uri}` });
    } catch { Alert.alert('共有できませんでした', '画像の生成または共有に失敗しました。もう一度お試しください。'); }
  };
  const choose = async (option: ShareKind) => {
    setKind(option);
    if (option === 'overlay' && !photo) { await selectPhoto(); return; }
  };
  const renderCard = (story = false) => <View ref={story ? storyRef : cardRef} collapsable={false} style={{ width: story ? 360 : 320, height: story ? 640 : undefined, justifyContent: story ? 'center' : undefined, backgroundColor: '#087f79', borderRadius: story ? 0 : 20, padding: story ? 30 : 22 }}>
    {stats}
  </View>;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
    <Screen title="完了" headerShown={false} bottomDock={false} overlay={
      <View style={{ backgroundColor: colors.surface, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 }}>
        <Button label="ホームへ" onPress={() => router.replace('/')} />
      </View>
    }>
      <View style={{ paddingTop: 12, paddingBottom: 16 }}>
        <Text style={styles.title}>トレーニング完了</Text>
        {session && <Text style={[styles.small, { marginTop: 6 }]}>記録は自動保存されます</Text>}
      </View>
      {highlight && <Card style={{ backgroundColor: colors.soft, padding: 20 }}>
        <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '800', marginBottom: 8 }}>↗ 今回の成長</Text>
        <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>{exerciseName(highlight.id)}{highlight.side === 'left' ? ' · 左' : highlight.side === 'right' ? ' · 右' : ''}</Text>
        <Text style={[styles.metric, { color: colors.primary }]}>+{(highlight.gain * 100).toFixed(1)}%</Text>
        <Text style={[styles.body, { fontWeight: '700', marginTop: 8 }]}>{formatWeight(highlight.before)} → {formatWeight(highlight.after)}</Text>
        <Text style={[styles.small, { marginTop: 6 }]}>前回比 · 推定1RM（重量と回数から算出）</Text>
      </Card>}
      <View style={[styles.row, { marginBottom: 16 }]}>{[[exerciseCount, '種目'], [sets.length, 'セット'], [minutes, '分']].map(([value, label]) => <Card key={label} style={{ flex: 1, alignItems: 'center' }}><Text style={styles.metric}>{value}</Text><Text style={styles.small}>{label}</Text></Card>)}</View>
      <SessionVolumeChart key={session?.id} rows={sessionVolumes(state, session?.id ?? -1)} ready={!session || celebrationDone === session.id} />
      <Text style={styles.sectionTitle}>今回の記録</Text>
      <SessionDetails sessionIds={session ? [session.id] : []} />
      <Button label="共有" secondary disabled={!session} onPress={() => setSheet(true)} />
      <Button label="ルームの比較を見る" secondary disabled={!session} onPress={() => router.push('/rooms')} />
      {finalSkip && !state.sessions.some((item) => item.status === 'IN_PROGRESS') &&
        <Button label="最後のスキップを取り消す" secondary onPress={() => {
          update((s) => reopenSkippedCard(s, { setId: finalSkip.id, side: finalSkip.finalSkippedSide === 'normal' ? undefined : finalSkip.finalSkippedSide }));
          router.replace('/workout');
        }} />}
      <Modal visible={sheet} transparent animationType="slide" onRequestClose={() => setSheet(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#0008' }}><Pressable style={{ flex: 1 }} onPress={() => setSheet(false)} /><View style={{ backgroundColor: colors.surface, padding: 20, paddingBottom: 32, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
          <Text style={styles.sectionTitle}>共有方法を選択</Text>
          {([['activity', 'アクティビティシェア', '記録をまとめた画像を作成'], ['overlay', 'スタッツオーバーレイ', '写真に統計情報を重ねる'], ['story', 'ストーリーズシェア', '縦長 9:16 の画像を作成']] as const).map(([value, title, detail]) => <Pressable key={value} onPress={() => void choose(value)} style={{ padding: 14, marginVertical: 4, borderRadius: 14, backgroundColor: kind === value ? colors.soft : colors.bg }}><Text style={{ color: colors.ink, fontSize: 16, fontWeight: '800' }}>{title}</Text><Text style={styles.small}>{detail}</Text></Pressable>)}
          {kind === 'overlay' && <Pressable onPress={() => void selectPhoto()} style={{ padding: 12 }}><Text style={{ color: colors.primary, fontWeight: '700' }}>{photo ? '写真を変更' : '写真を選択'}</Text></Pressable>}
          <View style={{ position: 'absolute', left: -1000, top: 0 }} pointerEvents="none">{renderCard()}{renderCard(true)}<View ref={overlayRef} collapsable={false} style={{ width: 320, padding: 18, backgroundColor: 'transparent' }}>{stats}</View></View>
          {kind === 'overlay' && photo && <View style={{ height: 130, marginVertical: 8 }}><Image source={{ uri: photo }} style={{ width: '100%', height: '100%', position: 'absolute', borderRadius: 12 }} resizeMode="cover"/><View style={{ alignSelf: 'flex-start', margin: 8, padding: 10, backgroundColor: '#0008', borderRadius: 10 }}>{stats}</View></View>}
          <Button label="プレビューを共有" onPress={() => void sendImage(kind === 'story' ? storyRef : kind === 'overlay' ? overlayRef : cardRef, kind === 'story' ? 'FitSwipe ストーリーズ' : 'FitSwipe トレーニング記録')} />
          <Button label="閉じる" secondary onPress={() => setSheet(false)} />
        </View></View>
      </Modal>
    </Screen>
    {session && celebrationDone !== session.id && <CompletionCelebration key={session.id} sessionId={session.id} onDone={() => setCelebrationDone(session.id)} />}
    </View>
  );
}
