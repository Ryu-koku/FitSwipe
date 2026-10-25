import React, { useState } from 'react';
import { Alert, Pressable, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../context';
import { achievementSummary, formatWeight } from '../logic';
import {
  Button,
  Card,
  IconButton,
  Screen,
  SectionTitle,
  Sheet,
  useTheme,
} from '../ui';
import { WorkoutCalendar } from '../components/WorkoutCalendar';

const metrics = [
  ['days', '累計トレーニング日数', '同じ日に複数回行っても1日として数えます。'],
  ['sets', '累計完了セット数', '左右別種目は左右で1セットとして数えます。'],
  ['history', '記録歴', '最初に完了したトレーニング記録からの期間です。'],
  [
    'streak',
    '継続週数',
    '週に1回以上の完了記録が対象です。今週が未達成でも先週までの連続記録を保持します。',
  ],
  ['volume', '累計挙上重量', '重量×回数の合計。左右別は左右を合算します。'],
  ['reps', '累計回数', '完了セットの回数。左右別は左右を合算します。'],
  [
    'bests',
    '自己ベスト更新回数',
    '初回を除き、種目・左右ごとに1トレーニングで最大1回です。',
  ],
  [
    'big3',
    'BIG3トータル',
    '終了したトレーニングの1〜10回の完了記録からEpley式で推定します。ベンチプレス・スクワット・デッドリフトがそろうと合計を表示します。',
  ],
] as const;

export default function HomeScreen() {
  const { state, update } = useApp();
  const { colors, styles } = useTheme();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(state.visibleAchievementMetrics);
  const summary = achievementSummary(state);
  const active = state.sessions.find((s) => s.status === 'IN_PROGRESS');
  const count = (value: number) => value.toLocaleString('ja-JP');
  const values: Record<string, string> = {
    days: `${count(summary.trainingDays)} 日`,
    sets: `${count(summary.completedSets)} セット`,
    history: summary.recordHistoryLabel,
    streak: `${summary.streakWeeks} 週`,
    volume:
      summary.liftedWeightKg >= 1000
        ? `${(summary.liftedWeightKg / 1000).toFixed(1)} トン`
        : formatWeight(summary.liftedWeightKg),
    reps: `${count(summary.totalRepetitions)} 回`,
    bests: `${count(summary.personalBestUpdates)} 回`,
    big3: formatWeight(summary.big3),
  };
  return (
    <Screen
      title="FitSwipe"
      right={
        <IconButton
          label="設定"
          symbol="⚙"
          onPress={() => router.push('/settings')}
        />
      }
    >
      {active && (
        <Card>
          <View style={styles.row}>
            <Text style={styles.body}>進行中のトレーニング</Text>
            <Button
              label="再開"
              secondary
              onPress={() => router.push('/prepare')}
            />
          </View>
        </Card>
      )}
      <SectionTitle>カレンダー</SectionTitle>
      <WorkoutCalendar />
      <View style={styles.row}>
        <SectionTitle>これまでの頑張り</SectionTitle>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setDraft(state.visibleAchievementMetrics);
            setEditing(true);
          }}
        >
          <Text style={styles.tab}>編集</Text>
        </Pressable>
      </View>
      <View style={[styles.wrap, { gap: 10 }]}>
        {metrics
          .filter(
            ([key]) =>
              state.visibleAchievementMetrics.includes(key) &&
              key !== 'big3' &&
              key !== 'streak',
          )
          .map(([key, label, explanation]) => (
            <Pressable
              key={key}
              accessibilityRole="button"
              onPress={() => Alert.alert(`${label}について`, explanation)}
              style={{ width: '48%' }}
            >
              <Card style={{ minHeight: 102 }}>
                <Text style={styles.metric}>{values[key]}</Text>
                <Text style={styles.metricLabel}>{label}</Text>
              </Card>
            </Pressable>
          ))}
      </View>
      {state.visibleAchievementMetrics.includes('big3') && (
        <Pressable
          accessibilityRole="button"
          onPress={() => Alert.alert('BIG3トータルについて', metrics[7][2])}
        >
          <Card>
            <Text style={styles.body}>BIG3トータル　推定1RM</Text>
            <Text
              style={[styles.metric, { color: colors.primary, marginTop: 10 }]}
            >
              {values.big3}
            </Text>
            <View style={[styles.row, { marginTop: 12 }]}>
              {(
                [
                  ['bench', 'ベンチ'],
                  ['squat', 'スクワット'],
                  ['deadlift', 'デッドリフト'],
                ] as const
              ).map(([key, label]) => (
                <View key={key} style={{ flex: 1 }}>
                  <Text style={styles.small}>{label}</Text>
                  <Text style={styles.body}>
                    {summary.big3Lifts[key]
                      ? formatWeight(summary.big3Lifts[key])
                      : '未記録'}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        </Pressable>
      )}
      {state.visibleAchievementMetrics.includes('streak') && (
        <Pressable
          accessibilityRole="button"
          onPress={() => Alert.alert('継続週数について', metrics[3][2])}
        >
          <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Text style={styles.body}>ストリーク</Text>
            <Text style={{ fontSize: 64 }}>♨</Text>
            <Text
              style={[styles.metric, { color: colors.primary, fontSize: 42 }]}
            >
              {summary.streakWeeks}
            </Text>
            <Text style={styles.body}>週</Text>
            <Text style={styles.small}>
              {summary.streakWeeks > 0
                ? '今週も積み重ねよう'
                : '今週から積み重ねよう'}
            </Text>
          </Card>
        </Pressable>
      )}
      {!state.visibleAchievementMetrics.length && (
        <Text style={styles.small}>編集から表示する項目を選べます</Text>
      )}
      {editing && (
        <Sheet title="表示する項目" onClose={() => setEditing(false)}>
          {metrics.map(([key, label]) => (
            <View key={key} style={[styles.row, { marginBottom: 12 }]}>
              <Text style={styles.body}>{label}</Text>
              <Switch
                accessibilityLabel={label}
                value={draft.includes(key)}
                onValueChange={(enabled) =>
                  setDraft((current) =>
                    enabled
                      ? [...current, key]
                      : current.filter((k) => k !== key),
                  )
                }
              />
            </View>
          ))}
          <Button
            label="保存"
            onPress={() => {
              update((s) => ({ ...s, visibleAchievementMetrics: draft }));
              setEditing(false);
            }}
          />
        </Sheet>
      )}
    </Screen>
  );
}
