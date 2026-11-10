import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../context';
import { Button, Card, Chip, Screen, SectionTitle, Sheet, useTheme } from '../ui';
import {
  exerciseRecords,
  metricLabels,
  personalBest,
  progressIndex,
  progressPreferences,
} from '../home-progress';
import type { ProgressMetric, ProgressRecord, ProgressSide } from '../home-progress';
import { ProgressTrend } from '../components/HomeProgress';
import { SessionDetails } from '../components/SessionDetails';
import { RecordComparison } from '../components/RecordComparison';
import { periodLabels, periodRecords } from '../record-comparison';
import type { RecordPeriod } from '../record-comparison';
import { formatWeight, localDay } from '../logic';

export default function GrowthScreen() {
  const params = useLocalSearchParams<{ exerciseId?: string; side?: string; metric?: string }>();
  const { state } = useApp();
  const { colors, styles } = useTheme();
  const preferences = progressPreferences(state.homeProgress);
  const exerciseId = Number(params.exerciseId ?? state.homeGrowthExerciseId);
  const exercise = state.exercises.find((e) => e.id === exerciseId);
  const [metric, setMetric] = useState<ProgressMetric>(
    params.metric === 'weight' || params.metric === 'reps' ? params.metric : 'estimated',
  );
  const [selectedSide, setSide] = useState<1 | 2>(
    params.side === '2' ? 2 : params.side === '1' ? 1 : preferences.side,
  );
  const side: ProgressSide = exercise?.mode === 'BILATERAL' ? selectedSide : 0;
  const [selectedDate, setSelectedDate] = useState<string>();
  const [history, setHistory] = useState(false);
  const [period, setPeriod] = useState<RecordPeriod>('all');
  const today = new Date().toDateString();
  const index = useMemo(
    () =>
      progressIndex(
        { exercises: state.exercises, sessions: state.sessions, sets: state.sets },
        new Date(today),
      ),
    [state.exercises, state.sessions, state.sets, today],
  );
  const records = exercise ? exerciseRecords(index, exercise.id, side) : [];
  const bestRecords = periodRecords(records, period, new Date(today));
  const dates = [...new Set(records.map((record) => record.date))].reverse();
  const daySessions = state.sessions.filter(
    (s) => s.status === 'COMPLETED' && localDay(s.startedAt) === selectedDate,
  );
  const summary = (record: ProgressRecord) =>
    `${record.weight > 0 ? formatWeight(record.weight) : '重量なし'} × ${record.reps}回`;
  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  return (
    <Screen title={exercise?.name ?? '種目の記録'} bottomDock={false} onBack={back}>
      {!exercise ? (
        <Card>
          <Text style={styles.body}>
            この種目は見つかりません。ホームで種目を選び直してください。
          </Text>
          <Button label="ホームへ" onPress={() => router.replace('/')} />
        </Card>
      ) : (
        <>
          {exercise.mode === 'BILATERAL' && (
            <View style={styles.wrap}>
              <Chip label="左" active={side === 1} onPress={() => setSide(1)} />
              <Chip label="右" active={side === 2} onPress={() => setSide(2)} />
            </View>
          )}
          <Card>
            <ProgressTrend records={records} metric={metric} onMetric={setMetric} />
          </Card>
          <SectionTitle>
            自己ベスト · {periodLabels[period]}{side ? (side === 1 ? ' · 左' : ' · 右') : ''}
          </SectionTitle>
          <Card>
            <View style={styles.wrap}>
              {(['all', 'month', 'year'] as const).map((key) => <Chip key={key}
                label={periodLabels[key]} active={period === key} onPress={() => setPeriod(key)} />)}
            </View>
            <Text style={[styles.small, { marginVertical: 8 }]}>対象：{period === 'all' ? 'すべての完了記録' : `${new Date(today).getFullYear()}年${period === 'month' ? `${new Date(today).getMonth() + 1}月` : ''}の初日から今日まで`}</Text>
            {(['weight', 'reps'] as const).map((key) => {
              const best = personalBest(bestRecords, key);
              return (
                <View key={key} style={{ marginBottom: 12 }}>
                  <Text style={styles.small}>{metricLabels[key]}</Text>
                  {best ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${metricLabels[key]}を達成した${best.date}の記録を見る`}
                      onPress={() => setSelectedDate(best.date)}
                      style={{ minHeight: 48, justifyContent: 'center' }}
                    >
                      <Text style={[styles.body, { color: colors.primary, fontWeight: '700' }]}>
                        {summary(best)} ›
                      </Text>
                      <Text style={styles.small}>{best.date}</Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.body}>
                      {key === 'weight'
                        ? 'この期間に重量ありの記録がありません。'
                        : 'この期間に完了した記録がありません。'}
                    </Text>
                  )}
                </View>
              );
            })}
            <Text style={styles.small}>
              実際に記録した重量・回数です。最多回数には異なる重量も含みます。記録を押すと、その日の全セットを確認できます。
            </Text>
          </Card>
          <RecordComparison key={`${exercise.id}:${side}`} records={records} onOpenRecord={(record) => setSelectedDate(record.date)} />
          <Button
            label={history ? '履歴を閉じる' : '履歴を見る'}
            secondary
            onPress={() => setHistory((value) => !value)}
          />
          {history && (
            <Card>
              {!dates.length && <Text style={styles.body}>まだ完了した記録がありません。</Text>}
              {dates.map((date) => (
                <Pressable
                  key={date}
                  accessibilityRole="button"
                  accessibilityLabel={`${date}の全セットを見る`}
                  onPress={() => setSelectedDate(date)}
                  style={{
                    minHeight: 48,
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderColor: colors.line,
                  }}
                >
                  <Text style={[styles.body, { color: colors.primary }]}>{date} ›</Text>
                  <Text style={styles.small}>
                    {records.filter((record) => record.date === date).length}セット
                  </Text>
                </Pressable>
              ))}
            </Card>
          )}
        </>
      )}
      {selectedDate && (
        <Sheet title={`${selectedDate}の記録`} onClose={() => setSelectedDate(undefined)}>
          <SessionDetails sessionIds={daySessions.map((s) => s.id)} />
        </Sheet>
      )}
    </Screen>
  );
}
