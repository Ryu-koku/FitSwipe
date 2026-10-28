import React, { useEffect, useRef, useState } from 'react';
import {
  AppState as NativeAppState,
  Pressable,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useApp } from '../context';
import { formatWeight } from '../logic';
import {
  Button,
  Card,
  IconButton,
  Screen,
  Sheet,
  feedback,
  useTheme,
} from '../ui';
import {
  advanceWorkout,
  cardCompleted,
  currentCard,
  finishWorkout,
  startWorkout,
  undoWorkout,
  updateSet,
  workoutCards,
} from '../workout';
import { SwipeCard } from '../components/SwipeCard';
import { WorkoutOrderEditor } from '../components/WorkoutOrderEditor';
import type { WorkoutCard } from '../types';
import { ExercisePictogram } from '../components/ExercisePictogram';

export default function WorkoutScreen() {
  const { state, update, getState } = useApp();
  const { colors, styles } = useTheme();
  const [orderEditor, setOrderEditor] = useState(false);
  const [history, setHistory] = useState(false);
  const [browsing, setBrowsing] = useState<WorkoutCard>();
  const session = state.sessions.find((s) => s.status === 'IN_PROGRESS');
  const progress = state.workout;
  const current = session ? currentCard(state, session.id) : undefined;
  const card = browsing ?? current;
  const set = state.sets.find((s) => s.id === card?.setId);
  const exercise = state.exercises.find((e) => e.id === set?.exerciseId);
  const locked = useRef(false);
  useEffect(() => {
    locked.current = false;
  }, [current?.setId, current?.side, progress?.restEndsAt]);
  useEffect(() => {
    if (session && progress?.sessionId !== session.id)
      update((s) => startWorkout(s));
  }, [session, progress?.sessionId, update]);
  useFocusEffect(
    React.useCallback(() => {
      void activateKeepAwakeAsync('workout').catch(() => {});
      return () => {
        void deactivateKeepAwake('workout').catch(() => {});
      };
    }, []),
  );
  if (!session || !set || !exercise || !card)
    return (
      <Screen title="トレーニング">
        <Text style={styles.body}>進行中のカードはありません。</Text>
        {session && (
          <Button
            label="トレーニングを終了"
            onPress={() => {
              update((s) => finishWorkout(s, session.id));
              router.replace({
                pathname: '/complete',
                params: { sessionId: session.id },
              });
            }}
          />
        )}
        <Button
          label="準備画面へ"
          secondary
          onPress={() => router.replace('/prepare')}
        />
      </Screen>
    );
  const rows = state.sets.filter((s) => s.sessionId === session.id);
  const cards = workoutCards(state, session.id);
  const completedCount = cards.filter((c) => cardCompleted(state, c)).length;
  const order = [...new Set(rows.map((s) => s.exerciseId))];
  const exerciseSets = rows.filter((s) => s.exerciseId === exercise.id);
  const older = state.sessions
    .filter((s) => s.status === 'COMPLETED')
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const previousSession = older.find((s) =>
    state.sets.some(
      (row) =>
        row.sessionId === s.id &&
        row.exerciseId === exercise.id &&
        row.isCompleted,
    ),
  );
  const previousSets = state.sets
    .filter(
      (s) =>
        s.sessionId === previousSession?.id &&
        s.exerciseId === exercise.id &&
        s.isCompleted,
    )
    .sort((a, b) => a.setOrder - b.setOrder);
  const previous =
    previousSets.find((s) => s.setOrder === set.setOrder) ??
    previousSets.at(-1);
  const side = card.side ?? 'normal';
  const weightKey = `${side}WeightKg` as const;
  const repsKey = `${side}Reps` as const;
  const step = state.exerciseWeightSteps[exercise.id] ?? state.weightStepKg;
  const skipRest = () =>
    update((s) => ({
      ...s,
      workout: s.workout
        ? { ...s.workout, restStartedAt: undefined, restEndsAt: undefined }
        : undefined,
    }));
  const advance = (skip = false) => {
    if (locked.current || browsing) return;
    locked.current = true;
    const changed = advanceWorkout(getState(), skip);
    update(() => changed);
    if (!changed.workout)
      router.replace({
        pathname: '/complete',
        params: { sessionId: session.id },
      });
  };
  const position = cards.findIndex(
    (c) => c.setId === card.setId && c.side === card.side,
  );
  const visited = cards
    .slice(0, position)
    .filter((c) => cardCompleted(state, c));
  const preset = state.presets.find((p) => p.id === session.presetId);
  const rest = !browsing && !!progress?.restEndsAt;
  const change = (key: typeof weightKey | typeof repsKey, delta: number) => {
    feedback();
    update((s) => {
      const row = s.sets.find((item) => item.id === set.id)!;
      return updateSet(s, set.id, {
        [key]: Math.max(0, Math.round(((row[key] ?? 0) + delta) * 100) / 100),
      });
    });
  };
  return (
    <Screen
      scroll={false}
      title={preset?.name ?? 'トレーニング'}
      onBack={() => {
        if (browsing) setBrowsing(undefined);
        else update(undoWorkout);
      }}
      right={
        <IconButton
          label="トレーニングを終了"
          symbol="×"
          onPress={() => {
            update((s) => finishWorkout(s, session.id));
            router.replace('/');
          }}
        />
      }
    >
      <View style={[styles.row, { marginBottom: 8 }]}>
        <Text style={styles.small}>
          {order.indexOf(exercise.id) + 1} / {order.length} 種目
        </Text>
        <Text style={styles.small}>
          {completedCount} / {cards.length} 完了
        </Text>
      </View>
      <View
        style={{
          height: 5,
          borderRadius: 3,
          backgroundColor: colors.line,
          marginBottom: 16,
        }}
      >
        <View
          style={{
            height: 5,
            borderRadius: 3,
            backgroundColor: colors.primary,
            width: `${cards.length ? (completedCount / cards.length) * 100 : 0}%`,
          }}
        />
      </View>
      <View style={{ flex: 1, paddingBottom: 16 }}>
        {rest ? (
          <RestCard
            key={progress.restEndsAt}
            endsAt={progress.restEndsAt!}
            exerciseName={exercise.name}
            next={`${formatWeight(set[weightKey])} × ${set[repsKey] ?? '—'}回`}
            onSkip={skipRest}
          />
        ) : (
          <SwipeCard
            key={`${set.id}-${side}-${!!browsing}`}
            onAdvance={() => advance()}
            onSkip={() => advance(true)}
            disabled={!!browsing}
          >
            <Card
              style={{
                flex: 1,
                overflow: 'hidden',
                padding: 0,
                backgroundColor: colors.soft,
                marginBottom: 0,
              }}
            >
              <View
                style={[
                  styles.row,
                  { padding: 18, backgroundColor: colors.primary },
                ]}
              >
                <ExercisePictogram name={exercise.name} />
                <Text
                  style={{
                    color: colors.bg,
                    fontSize: 24,
                    fontWeight: '800',
                    flex: 1,
                  }}
                >
                  {exercise.name}
                </Text>
                <Text style={{ color: colors.bg, fontWeight: '700' }}>
                  {set.setOrder}/{exerciseSets.length}
                </Text>
              </View>
              <View style={{ flex: 1, padding: 16, justifyContent: 'center' }}>
                {card.side && (
                  <Text
                    style={[
                      styles.title,
                      { textAlign: 'center', color: colors.primary },
                    ]}
                  >
                    {card.side === 'left' ? '左' : '右'}
                  </Text>
                )}
                <View
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <TapNumber
                    label="重量"
                    unit="kg"
                    value={set[weightKey]}
                    onIncrease={() => change(weightKey, step)}
                    onDecrease={() => change(weightKey, -step)}
                  />
                  <Text style={{ color: colors.primary, fontSize: 28 }}>×</Text>
                  <TapNumber
                    label="回数"
                    unit="回"
                    value={set[repsKey]}
                    onIncrease={() => change(repsKey, 1)}
                    onDecrease={() => change(repsKey, -1)}
                  />
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setHistory(true)}
                  style={{ padding: 12 }}
                >
                  <Text style={[styles.small, { textAlign: 'center' }]}>
                    前回　{formatWeight(previous?.[weightKey])} ×{' '}
                    {previous?.[repsKey] ?? '—'}回　›
                  </Text>
                </Pressable>
                {!browsing && (
                  <>
                    <Text style={[styles.small, { textAlign: 'center' }]}>
                      右・上にスワイプで完了
                    </Text>
                    <Button
                      label="スキップ"
                      secondary
                      onPress={() => advance(true)}
                    />
                  </>
                )}
              </View>
            </Card>
          </SwipeCard>
        )}
      </View>
      <View style={[styles.row, { marginBottom: 8 }]}>
        <Button
          label={browsing ? 'さらに前' : '前のカード'}
          disabled={!visited.length}
          secondary
          onPress={() => setBrowsing(visited.at(-1))}
        />
        {browsing ? (
          <Button
            label="現在へ"
            secondary
            onPress={() => setBrowsing(undefined)}
          />
        ) : (
          <IconButton
            label="種目を編集"
            symbol="✎"
            onPress={() => setOrderEditor(true)}
          />
        )}
      </View>
      {orderEditor && (
        <WorkoutOrderEditor
          sessionId={session.id}
          onClose={() => setOrderEditor(false)}
        />
      )}
      {history && (
        <Sheet
          title={`${exercise.name}の記録`}
          onClose={() => setHistory(false)}
        >
          {older.map((s) => {
            const sets = state.sets.filter(
              (row) =>
                row.sessionId === s.id &&
                row.exerciseId === exercise.id &&
                row.isCompleted,
            );
            return sets.length ? (
              <Card key={s.id}>
                <Text style={styles.body}>
                  {new Date(s.startedAt).toLocaleDateString('ja-JP')}
                </Text>
                {sets.map((row) => (
                  <Text key={row.id} style={styles.small}>
                    {row.setOrder}　{formatWeight(row[weightKey])} ×{' '}
                    {row[repsKey] ?? '—'}回
                  </Text>
                ))}
              </Card>
            ) : null;
          })}
          {!previousSession && (
            <Text style={styles.small}>過去の記録はありません</Text>
          )}
        </Sheet>
      )}
    </Screen>
  );
}

function TapNumber({
  label,
  unit,
  value,
  onIncrease,
  onDecrease,
}: {
  label: string;
  unit: string;
  value?: number;
  onIncrease: () => void;
  onDecrease: () => void;
}) {
  const { colors, styles } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignSelf: 'stretch',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text
        style={{ color: colors.ink, fontSize: 54, fontWeight: '800' }}
        adjustsFontSizeToFit
        numberOfLines={1}
      >
        {value ?? '—'}
      </Text>
      <Text style={styles.body}>{unit}</Text>
      <View
        style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}を増やす`}
          onPress={onIncrease}
          style={{ flex: 1 }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}を減らす`}
          onPress={onDecrease}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

function RestCard({
  endsAt,
  exerciseName,
  next,
  onSkip,
}: {
  endsAt: number;
  exerciseName: string;
  next: string;
  onSkip: () => void;
}) {
  const { colors, styles } = useTheme();
  const [clock, setClock] = useState(() => Date.now());
  const latestSkip = useRef(onSkip);
  useEffect(() => {
    latestSkip.current = onSkip;
  }, [onSkip]);
  useEffect(() => {
    const refresh = () => setClock(Date.now());
    const timer = setInterval(refresh, 250);
    const subscription = NativeAppState.addEventListener('change', refresh);
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);
  useEffect(() => {
    if (clock >= endsAt + 3000) latestSkip.current();
  }, [clock, endsAt]);
  const remaining = Math.max(0, Math.ceil((endsAt - clock) / 1000));
  return (
    <SwipeCard rest onAdvance={onSkip} onSkip={onSkip}>
      <Card
        style={{
          flex: 1,
          backgroundColor: colors.soft,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={[styles.title, { color: colors.primary }]}>休憩</Text>
        <View
          style={{
            width: 230,
            height: 230,
            maxWidth: '100%',
            borderRadius: 115,
            borderColor: colors.primary,
            borderWidth: 7,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text
            accessibilityLabel={
              remaining ? `次のセットまで残り${remaining}秒` : '休憩終了'
            }
            style={[styles.metric, { fontSize: 58 }]}
          >
            {Math.floor(remaining / 60)}:
            {String(remaining % 60).padStart(2, '0')}
          </Text>
        </View>
        <View style={{ width: '100%' }}>
          <Text style={styles.small}>NEXT SET</Text>
          <Text style={[styles.body, { fontWeight: '800' }]}>
            {exerciseName}
          </Text>
          <Text style={styles.small}>{next}</Text>
          <Button label="休憩をスキップ" secondary onPress={onSkip} />
        </View>
      </Card>
    </SwipeCard>
  );
}
