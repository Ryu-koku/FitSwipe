import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../context';
import { achievementSummary, completedSessions, formatWeight, selectedPreset } from '../logic';
import { Button, Card, Chip, Screen, SectionTitle, styles } from '../ui';

export default function HomeScreen() {
  const { state, ready } = useApp();
  if (!ready) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#2867d9" /></View>;
  const summary = achievementSummary(state);
  const preset = selectedPreset(state);
  const sessions = completedSessions(state).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return <Screen title="FitLog Solo">
    <Text style={styles.body}>トレーニングを記録して、昨日の自分を更新しよう。</Text>
    <Card style={{ backgroundColor: '#e9f1ff', borderColor: '#cfe0ff' }}>
      <View style={styles.row}><View><Text style={styles.small}>次のトレーニング</Text><Text style={[styles.metric, { color: '#1c50ad', marginTop: 4 }]}>{preset?.name ?? 'プリセットなし'}</Text></View><Text style={{ fontSize: 36 }}>🏋️</Text></View>
      <Button label="トレーニングを開始" onPress={() => router.push('/prepare')} />
    </Card>
    <SectionTitle>実績</SectionTitle>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      <Metric label="BIG3トータル" value={summary.big3 ? formatWeight(summary.big3) : '—'} />
      <Metric label="継続週数" value={`${summary.streakWeeks}週`} />
      <Metric label="トレーニング日数" value={`${summary.trainingDays}日`} />
      <Metric label="完了セット" value={`${summary.completedSets}`} />
    </View>
    <Card><Text style={styles.body}>累計挙上重量 <Text style={styles.metric}>{formatWeight(summary.liftedWeightKg)}</Text></Text><Text style={styles.small}>累計回数 {summary.totalRepetitions}回 ・ 自己ベスト更新 {summary.personalBestUpdates}回</Text></Card>
    <SectionTitle>メニュー</SectionTitle>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      <Chip label="記録を見る" onPress={() => router.push('/records')} /><Chip label="プリセット" onPress={() => router.push('/prepare')} /><Chip label="ルーム" onPress={() => router.push('/rooms')} /><Chip label="設定" onPress={() => router.push('/settings')} />
    </View>
    <SectionTitle>最近のトレーニング</SectionTitle>
    {sessions.length === 0 ? <Card><Text style={styles.muted}>まだ記録がありません。最初のトレーニングを始めましょう。</Text></Card> : sessions.slice(0, 5).map((session) => {
      const count = state.sets.filter((set) => set.sessionId === session.id && set.isCompleted).length;
      return <Card key={session.id}><View style={styles.row}><View><Text style={styles.body}>{new Date(session.startedAt).toLocaleDateString('ja-JP')}</Text><Text style={styles.small}>{state.presets.find((p) => p.id === session.presetId)?.name ?? 'フリートレーニング'}</Text></View><Text style={styles.metric}>{count}セット</Text></View></Card>;
    })}
    <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 }}><Text style={styles.tab}>ホーム</Text><Text style={styles.tab} onPress={() => router.push('/prepare')}>＋ 記録</Text><Text style={styles.tab} onPress={() => router.push('/rooms')}>ルーム</Text></View>
  </Screen>;
}

function Metric({ label, value }: { label: string; value: string }) { return <Card style={{ width: '47%', marginBottom: 0 }}><Text style={styles.metric}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></Card>; }
