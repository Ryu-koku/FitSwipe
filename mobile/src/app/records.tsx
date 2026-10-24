import React from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../context';
import { achievementSummary, completedSessions, formatWeight } from '../logic';
import { Button, Card, Screen, SectionTitle, styles } from '../ui';

export default function RecordsScreen() {
  const { state } = useApp();
  const summary = achievementSummary(state);
  const sessions = completedSessions(state).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return <Screen title="記録"><Card><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}><Stat label="挙上重量" value={formatWeight(summary.liftedWeightKg)} /><Stat label="回数" value={`${summary.totalRepetitions}`} /><Stat label="自己ベスト" value={`${summary.personalBestUpdates}`} /></View></Card><SectionTitle>トレーニング履歴</SectionTitle>{sessions.length === 0 ? <Card><Text style={styles.muted}>記録がありません。</Text></Card> : sessions.map((session) => { const sets = state.sets.filter((set) => set.sessionId === session.id && set.isCompleted); const volume = sets.reduce((sum, set) => sum + (set.normalWeightKg ?? 0) * (set.normalReps ?? 0) + (set.leftWeightKg ?? 0) * (set.leftReps ?? 0) + (set.rightWeightKg ?? 0) * (set.rightReps ?? 0), 0); return <Card key={session.id}><View style={styles.row}><View><Text style={styles.body}>{new Date(session.startedAt).toLocaleDateString('ja-JP')}</Text><Text style={styles.small}>{state.presets.find((p) => p.id === session.presetId)?.name ?? 'フリートレーニング'}</Text></View><View><Text style={styles.metric}>{sets.length}セット</Text><Text style={styles.small}>{formatWeight(volume)}</Text></View></View></Card>; })}<Button label="ホームへ" secondary onPress={() => router.back()} /></Screen>;
}
function Stat({ label, value }: { label: string; value: string }) { return <View style={{ width: '30%' }}><Text style={styles.metric}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>; }
