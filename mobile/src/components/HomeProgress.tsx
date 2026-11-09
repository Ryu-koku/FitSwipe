import React, { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../context';
import { Button, Card, Chip, Sheet, useTheme } from '../ui';
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

export function HomeProgress() {
  const { state, update } = useApp();
  const { colors, styles } = useTheme();
  const [choosing, setChoosing] = useState(false);
  const [expanded, setExpanded] = useState(false);
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
  return (
    <>
      {!expanded && preferences.view === 'trend' ? <Card style={{ marginTop: 16, marginBottom: 0, padding: 16 }}>
        <View style={styles.row}>
          <Text style={[styles.body, { fontWeight: '800', fontSize: 17 }]}>筋力の推移</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="記録の表示設定" onPress={() => setExpanded(true)} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ color: colors.primary }}>表示設定</Text>
          </Pressable>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="表示する種目を選ぶ" onPress={() => { setQuery(''); setChoosing(true); }} style={[styles.row, { minHeight: 44 }]}>
          <Text style={[styles.body, { flex: 1 }]}>{exercise?.name ?? '種目を選ぶ'}{exercise?.mode === 'BILATERAL' ? side === 1 ? '（左）' : '（右）' : ''}</Text>
          <Text style={{ color: colors.primary }}>変更 ›</Text>
        </Pressable>
        <Text style={styles.small}>{metricLabels[metric]} · 直近90日</Text>
        {dailyProgress(records, metric).length ? <ProgressChart compact points={dailyProgress(records, metric)} unit={metric === 'reps' ? '回' : 'kg'} /> : <Text style={[styles.small, { paddingVertical: 16 }]}>記録がそろうと、ここに推移を表示します。</Text>}
        <View style={styles.row}>
          {exercise && <View style={{ flex: 1 }}><Button label="詳しく見る" secondary onPress={() => openProgress(exercise.id, side, metric)} /></View>}
          {!records.length && <View style={{ flex: 1 }}><Button label="トレーニングへ" onPress={() => router.push('/prepare')} /></View>}
        </View>
      </Card> : <Card style={{ padding: 16, marginTop: 16, marginBottom: 0 }}>
        <Text style={[styles.body, { fontWeight: '800', fontSize: 17, marginBottom: 12 }]}>自分の記録の変化</Text>
        <View style={styles.wrap}>
          <Chip
            label="推移"
            active={preferences.view === 'trend'}
            onPress={() => change({ view: 'trend' })}
          />
          <Chip
            label="ランキング"
            active={preferences.view === 'ranking'}
            onPress={() => change({ view: 'ranking' })}
          />
        </View>
        {preferences.view === 'trend' ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="表示する種目を選ぶ"
              onPress={() => {
                setQuery('');
                setChoosing(true);
              }}
              style={[styles.row, { minHeight: 48, marginVertical: 8 }]}
            >
              <Text style={[styles.body, { flex: 1, fontWeight: '700' }]}>
                {exercise?.name ?? '種目を選ぶ'}
              </Text>
              <Text style={{ color: colors.primary }}>変更 ›</Text>
            </Pressable>
            {exercise?.mode === 'BILATERAL' && (
              <View style={styles.wrap}>
                <Chip label="左" active={side === 1} onPress={() => change({ side: 1 })} />
                <Chip label="右" active={side === 2} onPress={() => change({ side: 2 })} />
              </View>
            )}
            <ProgressTrend
              compact
              records={records}
              metric={metric}
              onMetric={(metric) => change({ metric })}
            />
            {exercise && (
              <Button
                label="詳しく見る"
                secondary
                onPress={() => openProgress(exercise.id, side, metric)}
              />
            )}
          </>
        ) : (
          <>
            <View style={[styles.wrap, { marginTop: 8 }]}>
              <Chip
                label="筋力の伸び率"
                active={preferences.ranking === 'change'}
                onPress={() => change({ ranking: 'change' })}
              />
              <Chip
                label="自己ベスト更新日数"
                active={preferences.ranking === 'updates'}
                onPress={() => change({ ranking: 'updates' })}
              />
            </View>
            <Text style={[styles.small, { marginVertical: 8 }]}>
              自分の種目同士の比較 · 直近90日 · 上位5件
            </Text>
            {rows.map((row, position) => (
              <Pressable
                key={`${row.exerciseId}:${row.side}`}
                accessibilityRole="button"
                accessibilityLabel={`${row.name}の詳細を見る`}
                onPress={() => openProgress(row.exerciseId, row.side, row.metric)}
                style={[
                  styles.row,
                  {
                    minHeight: 52,
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderColor: colors.line,
                  },
                ]}
              >
                <Text style={[styles.body, { color: colors.primary }]}>{position + 1}位</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.body, { fontWeight: '700' }]}>{row.name}</Text>
                  {preferences.ranking === 'updates' && row.value === 0 && (
                    <Text style={styles.small}>
                      {row.recentDays === 1
                        ? '初回・同値は更新に含めません'
                        : '期間内の更新はありません'}
                    </Text>
                  )}
                </View>
                <Text style={[styles.body, { color: colors.primary, fontWeight: '700' }]}>
                  {preferences.ranking === 'change'
                    ? `${row.value > 0 ? '+' : ''}${row.value.toFixed(1)}%`
                    : `${row.value}日`}{' '}
                  ›
                </Text>
              </Pressable>
            ))}
            {!rows.length && (
              <View style={{ paddingVertical: 12 }}>
                <Text style={styles.body}>
                  {preferences.ranking === 'change'
                    ? '比較できる種目がありません。重量あり・1〜10回の完了記録が2日以上そろうと表示します。'
                    : '対象の完了記録がありません。重量ありは推定最大重量（1〜10回）、重量なしは最多回数で集計します。'}
                </Text>
                <Button label="トレーニングへ" onPress={() => router.push('/prepare')} />
              </View>
            )}
            <Text style={[styles.small, { marginTop: 12 }]}>
              {preferences.ranking === 'change'
                ? '期間内の最初と最後の推定最大重量を比較。重量なしの種目は対象外です。記録開始直後の種目が上位になりやすい指標です。'
                : '全期間の過去最高を超えた日数。初回・同値は含めず、同日複数更新も1日。重量ありは推定最大重量、重量なしは最多回数で比較します。実施頻度が高い種目ほど上位になりやすい指標です。'}
            </Text>
          </>
        )}
        <Button label={preferences.view === 'ranking' ? '推移に戻る' : '表示設定を閉じる'} secondary onPress={() => { setExpanded(false); change({ view: 'trend' }); }} />
      </Card>}
      {choosing && (
        <Sheet title="表示する種目" onClose={() => setChoosing(false)}>
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
                setChoosing(false);
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
        </Sheet>
      )}
    </>
  );
}
