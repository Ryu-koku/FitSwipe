import React, { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../context';
import { Button, Card, Chip, IconButton, Sheet, useTheme } from '../ui';
import {
  dailyProgress,
  exerciseRecords,
  isBodyweight,
  metricLabels,
  progressIndex,
  progressPreferences,
  progressRanking,
} from '../home-progress';
import type {
  ProgressMetric,
  ProgressPreferences,
  ProgressRecord,
  ProgressSide,
} from '../home-progress';
import { ProgressChart } from './ProgressChart';

export function ProgressTrend({
  records,
  metric,
  onMetric,
  compact = false,
}: {
  records: ProgressRecord[];
  metric: ProgressMetric;
  onMetric: (metric: ProgressMetric) => void;
  compact?: boolean;
}) {
  const { styles } = useTheme();
  const bodyweight = isBodyweight(records);
  const effectiveMetric = bodyweight ? 'reps' : metric;
  const points = dailyProgress(records, effectiveMetric);
  return (
    <>
      {!bodyweight && (
        <View style={styles.wrap}>
          {(['estimated', 'weight', 'reps'] as const).map((key) => (
            <Chip
              key={key}
              label={metricLabels[key]}
              active={metric === key}
              onPress={() => onMetric(key)}
            />
          ))}
        </View>
      )}
      <Text style={[styles.small, { marginTop: 8 }]}>
        {metricLabels[effectiveMetric]} · 直近90日 · 日ごとの最大値
      </Text>
      {bodyweight && (
        <Text style={styles.small}>
          重量なしの記録は最多回数で表示します。推定最大重量は重量ありの記録が対象です。
        </Text>
      )}
      {points.length ? (
        <ProgressChart compact={compact} points={points} unit={effectiveMetric === 'reps' ? '回' : 'kg'} />
      ) : (
        <View style={{ paddingVertical: 16 }}>
          <Text style={styles.body}>
            {!records.length
              ? 'まだ完了した記録がありません。'
              : effectiveMetric === 'estimated'
                ? '直近90日に、重量あり・1〜10回の完了記録がありません。'
                : effectiveMetric === 'weight'
                  ? '直近90日に重量ありの完了記録がありません。'
                  : '直近90日に回数の完了記録がありません。'}
          </Text>
          <Button label="トレーニングへ" onPress={() => router.push('/prepare')} />
        </View>
      )}
      {effectiveMetric === 'estimated' && (
        <Text style={styles.small}>
          重量と回数からの推定値です。実際に持ち上げた最大重量ではありません。重量あり・1〜10回の完了記録が対象です。
        </Text>
      )}
      {effectiveMetric === 'reps' && (
        <Text style={styles.small}>
          重量が違う記録も含みます。回数の増加だけで筋力向上とは判断できません。
        </Text>
      )}
    </>
  );
}

export function openProgress(exerciseId: number, side: ProgressSide, metric: ProgressMetric) {
  router.push({
    pathname: '/growth',
    params: { exerciseId: String(exerciseId), side: String(side), metric },
  });
}

export function HomeProgress({ availableHeight = 0 }: { availableHeight?: number }) {
  const [headerHeight, setHeaderHeight] = useState(44);
  const [metricHeight, setMetricHeight] = useState(18);
  const { state, update } = useApp();
  const { colors, styles } = useTheme();
  const [choosing, setChoosing] = useState(false);
  const [query, setQuery] = useState('');
  const preferences = progressPreferences(state.homeProgress);
  const today = new Date().toDateString();
  const index = useMemo(
    () =>
      progressIndex(
        { exercises: state.exercises, sessions: state.sessions, sets: state.sets },
        new Date(today),
      ),
    [state.exercises, state.sessions, state.sets, today],
  );
  const exercises = state.exercises.filter((e) => !e.archived);
  const exercise = exercises.find((e) => e.id === state.homeGrowthExerciseId) ?? exercises[0];
  const side: ProgressSide = exercise?.mode === 'BILATERAL' ? preferences.side : 0;
  const records = exercise ? exerciseRecords(index, exercise.id, side) : [];
  const metric = isBodyweight(records) ? 'reps' : preferences.metric;
  const rows =
    preferences.view === 'ranking' ? progressRanking(state, index, preferences.ranking) : [];
  const change = (patch: Partial<ProgressPreferences>) =>
    update((s) => ({
      ...s,
      homeProgress: { ...progressPreferences(s.homeProgress), ...patch },
    }));
  const matching = exercises.filter((e) =>
    e.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  const points = dailyProgress(records, metric);
  const open = () => preferences.view === 'ranking' ? router.push('/growth') : exercise ? openProgress(exercise.id, side, metric) : router.push('/prepare');
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel="記録の詳細を見る" onPress={open} style={{ marginTop: 12 }}>
      <Card style={{ minHeight: availableHeight, marginBottom: 0, padding: 16 }}>
        <View onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)} style={styles.row}>
          <Text numberOfLines={1} style={[styles.body, { flex: 1, fontWeight: '800', fontSize: 17 }]}>
            {preferences.view === 'ranking' ? preferences.ranking === 'change' ? '伸び率' : '自己ベスト更新' : `${exercise?.name ?? '筋力'}${exercise?.mode === 'BILATERAL' ? side === 1 ? '（左）' : '（右）' : ''}`}
          </Text>
          <IconButton label="ホームの表示を編集" symbol="✎" onPress={() => { setQuery(''); setChoosing(true); }} />
        </View>
        {preferences.view === 'ranking' ? rows.map((row, position) => (
          <Pressable key={`${row.exerciseId}:${row.side}`} accessibilityRole="button" accessibilityLabel={`${row.name}の詳細を見る`}
            onPress={() => openProgress(row.exerciseId, row.side, row.metric)}
            style={[styles.row, { minHeight: 44, borderBottomWidth: 1, borderColor: colors.line }]}>
            <Text style={[styles.body, { color: colors.primary }]}>{position + 1}</Text>
            <Text numberOfLines={1} style={[styles.body, { flex: 1, fontWeight: '700' }]}>{row.name}</Text>
            <Text style={[styles.body, { color: colors.primary, fontWeight: '700' }]}>
              {preferences.ranking === 'change' ? `${row.value > 0 ? '+' : ''}${row.value.toFixed(1)}%` : `${row.value}日`}
            </Text>
          </Pressable>
        )) : <>
          <Text onLayout={(event) => setMetricHeight(event.nativeEvent.layout.height)} style={styles.small}>{metricLabels[metric]}</Text>
          {points.length ? <ProgressChart compact availableHeight={Math.max(0, availableHeight - 34 - headerHeight - metricHeight)} points={points} unit={metric === 'reps' ? '回' : 'kg'} /> : null}
        </>}
        {(preferences.view === 'ranking' ? !rows.length : !points.length) && <Text style={[styles.small, { paddingVertical: 16 }]}>記録なし</Text>}
      </Card>
      </Pressable>
      {choosing && (
        <Sheet title="ホームの表示" onClose={() => setChoosing(false)}>
          <View style={styles.wrap}>
            <Chip label="推移" active={preferences.view === 'trend'} onPress={() => change({ view: 'trend' })} />
            <Chip label="伸び率" active={preferences.view === 'ranking' && preferences.ranking === 'change'} onPress={() => change({ view: 'ranking', ranking: 'change' })} />
            <Chip label="自己ベスト更新" active={preferences.view === 'ranking' && preferences.ranking === 'updates'} onPress={() => change({ view: 'ranking', ranking: 'updates' })} />
          </View>
          {preferences.view === 'trend' && <>
          {!isBodyweight(records) && <View style={[styles.wrap, { marginTop: 8 }]}>
            {(['estimated', 'weight', 'reps'] as const).map((key) => <Chip key={key} label={metricLabels[key]} active={metric === key} onPress={() => change({ metric: key })} />)}
          </View>}
          {exercise?.mode === 'BILATERAL' && <View style={[styles.wrap, { marginTop: 8 }]}>
            <Chip label="左" active={side === 1} onPress={() => change({ side: 1 })} />
            <Chip label="右" active={side === 2} onPress={() => change({ side: 2 })} />
          </View>}
          <TextInput
            accessibilityLabel="種目を検索"
            placeholder="種目を検索"
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            style={{
              color: colors.ink,
              borderWidth: 1,
              borderColor: colors.line,
              borderRadius: 12,
              padding: 12,
              marginBottom: 12,
            }}
          />
          {matching.map((item) => (
            <Button
              key={item.id}
              label={item.name}
              secondary={item.id !== exercise?.id}
              onPress={() => {
                update((s) => ({ ...s, homeGrowthExerciseId: item.id }));
              }}
            />
          ))}
          {!matching.length && (
            <Text style={styles.body}>
              {exercises.length
                ? '一致する種目がありません。'
                : 'トレーニング画面で種目を登録してください。'}
            </Text>
          )}
          </>}
        </Sheet>
      )}
    </>
  );
}
