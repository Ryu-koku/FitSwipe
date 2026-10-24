import React from 'react';
import { Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../context';
import { achievementSummary, formatWeight, selectedPreset } from '../logic';
import { Button, Card, Screen, SectionTitle, styles } from '../ui';

export default function CompleteScreen() {
  const { state } = useApp();
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const sessionId = Number(params.sessionId);
  const session = state.sessions.find((item) => item.id === sessionId) ?? state.sessions[state.sessions.length - 1];
  const count = session ? state.sets.filter((set) => set.sessionId === session.id && set.isCompleted).length : 0;
  const summary = achievementSummary(state);
  return <Screen title="完了"><Card style={{ alignItems: 'center', paddingVertical: 26 }}><Text style={{ fontSize: 48 }}>🎉</Text><Text style={styles.title}>お疲れさまでした</Text><Text style={styles.body}>{count}セットを記録しました</Text></Card><SectionTitle>今回の記録</SectionTitle><Card><Text style={styles.body}>累計挙上重量　<Text style={styles.metric}>{formatWeight(summary.liftedWeightKg)}</Text></Text><Text style={styles.body}>累計回数　<Text style={styles.metric}>{summary.totalRepetitions}回</Text></Text><Text style={styles.body}>継続週数　<Text style={styles.metric}>{summary.streakWeeks}週</Text></Text></Card><Button label="ルームに共有" onPress={() => router.push({ pathname: '/rooms', params: { shareSessionId: String(session?.id ?? '') } })} /><Button label="ホームへ" secondary onPress={() => router.replace('/')} /><Text style={styles.small}>{selectedPreset(state)?.name ?? 'フリートレーニング'}</Text></Screen>;
}
