import { WeightWheel } from '../components/WeightWheel';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  useWindowDimensions,
  Pressable,
  Switch,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useApp } from '../context';
import { formatWeight, indexSessionSets, localDay, previousSet } from '../logic';
import {
  feedback,
  Button,
  Card,
  Chip,
  IconButton,
  Screen,
  Sheet,
  useTheme,
} from '../ui';
import {
  advanceWorkout,
  nextExerciseCard,
  skipToNextExercise,
  currentCard,
  reopenSkippedCard,
  activeSession,
  finishWorkout,
  startWorkout,
  updateSet,
  workoutCards,
} from '../workout';
import { SwipeCard, SwipeActions } from '../components/SwipeCard';
import { AppIcon } from '../components/AppIcon';
import { WorkoutOrderEditor } from '../components/WorkoutOrderEditor';
import type { WorkoutCard, WorkoutSet } from '../types';
import { WorkoutPictogram } from '../components/WorkoutPictogram';
import { RestCard } from '../components/RestCard';
import { ProgressChart } from '../components/ProgressChart';
import { RecordComparison } from '../components/RecordComparison';
import { SessionDetails } from '../components/SessionDetails';
import { WorkoutProgressBar } from '../components/WorkoutProgressBar';
import { WorkoutNumberWheel } from '../components/WorkoutNumberWheel';
import { dailyProgress, exerciseRecords, isBodyweight, progressIndex } from '../home-progress';

let perfAdvanceStarted: number | undefined; // PERF-TEMP
let perfLayoutStarted: number | undefined; // PERF-TEMP
let perfFrameStarted: number | undefined; // PERF-TEMP
export default function WorkoutScreen() {
  return <React.Profiler id="WorkoutScreen" onRender={(id, phase, actualDuration) => { if (actualDuration > 2) console.log('[PERF] profiler', id, phase, `${actualDuration.toFixed(1)}ms`); }}><PerfWorkoutScreen /></React.Profiler>; // PERF-TEMP
} // PERF-TEMP
function PerfWorkoutScreen() { // PERF-TEMP
  const { fontScale } = useWindowDimensions();
  const wheelHeight = Math.max(44, Math.ceil(24 * fontScale)) * 2 + Math.max(56, Math.ceil(48 * fontScale));
  const perfRenderStarted = performance.now(); // PERF-TEMP
  React.useLayoutEffect(() => { // PERF-TEMP
    const started = perfAdvanceStarted; // PERF-TEMP
    if (started === undefined || started === perfLayoutStarted) return; // PERF-TEMP
    perfLayoutStarted = started; // PERF-TEMP
    console.log('[PERF] advance開始→commit(layout)', `${(performance.now() - started).toFixed(1)}ms`); // PERF-TEMP
  }); // PERF-TEMP
  useEffect(() => { // PERF-TEMP
    const started = perfAdvanceStarted; // PERF-TEMP
    if (started === undefined || started === perfFrameStarted) return; // PERF-TEMP
    perfFrameStarted = started; // PERF-TEMP
    let second: number | undefined; // PERF-TEMP
    const first = requestAnimationFrame(() => { // PERF-TEMP
      second = requestAnimationFrame(() => console.log('[PERF] advance開始→次フレーム描画 (double rAF)', `${(performance.now() - started).toFixed(1)}ms`)); // PERF-TEMP
    }); // PERF-TEMP
    return () => { cancelAnimationFrame(first); if (second !== undefined) cancelAnimationFrame(second); if (perfFrameStarted === started) perfFrameStarted = undefined; }; // PERF-TEMP
  }); // PERF-TEMP
  const { state, update, getState } = useApp();
  const { colors, styles } = useTheme();
  const [orderEditor, setOrderEditor] = useState(false);
  const controlTouch = useRef(false);
  const controlTouchHandlers = {
    onTouchStart: () => { controlTouch.current = true; },
    onTouchEnd: () => { controlTouch.current = false; },
    onTouchCancel: () => { controlTouch.current = false; },
  };
  const [history, setHistory] = useState(false);
  const [historySessionId, setHistorySessionId] = useState<number>();
  const [historyMetric, setHistoryMetric] = useState<'weight' | 'reps'>('weight');
  const [browsing, setBrowsing] = useState<WorkoutCard>();
  const [swipeProgress] = useState(() => new Animated.Value(0));
  const session = activeSession(state);
  const hasActiveSession = state.sessions.some((s) => s.status === 'IN_PROGRESS');
  const title = state.rooms.find(room => room.id === state.activeRoomId)?.name
    ?? state.presets.find(preset => preset.id === session?.presetId)?.name
    ?? 'トレーニング';
  const progress = state.workout;
  const current = useMemo(() => session ? currentCard(state, session.id) : undefined, [state, session]);
  const validBrowsing = browsing && state.sets.some((item) => item.id === browsing.setId && item.sessionId === session?.id) ? browsing : undefined;
  const card = validBrowsing ?? current;
  const cardSetId = card?.setId;
  const storedSet = useMemo(() => state.sets.find(s => s.id === cardSetId), [state.sets, cardSetId]);
  const draft = storedSet?.skippedInputs?.[card?.side ?? 'normal'];
  const set = storedSet && draft ? { ...storedSet,
    [`${card?.side ?? 'normal'}WeightKg`]: draft.weightKg,
    [`${card?.side ?? 'normal'}Reps`]: draft.reps,
  } : storedSet;
  const exercise = state.exercises.find((e) => e.id === set?.exerciseId);
  const locked = useRef(false);
  useEffect(() => {
    locked.current = false;
  }, [card?.setId, card?.side, progress]);
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
  const setsBySession = useMemo(() => indexSessionSets(state.sets), [state.sets]);
  const older = useMemo(() => state.sessions.filter(s => s.status === 'COMPLETED')
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt)), [state.sessions]);
  const exerciseId = exercise?.id;
  const previousSession = useMemo(() => older.find(s =>
    setsBySession.get(s.id)?.some(row => row.exerciseId === exerciseId && row.isCompleted)),
  [older, setsBySession, exerciseId]);
  const side = card?.side ?? 'normal';
  const today = localDay(new Date());
  const historyIndex = useMemo(() => history
    ? progressIndex({ sessions: state.sessions, sets: state.sets, exercises: state.exercises }, new Date(today + 'T12:00:00')) : undefined,
  [history, state.sessions, state.sets, state.exercises, today]);
  const historyRecords = useMemo(() => historyIndex && exerciseId !== undefined
    ? exerciseRecords(historyIndex, exerciseId, side === 'left' ? 1 : side === 'right' ? 2 : 0) : [],
  [historyIndex, exerciseId, side]);
  const historyBodyweight = isBodyweight(historyRecords);
  const metric = historyBodyweight ? 'reps' : historyMetric;
  const historyPoints = useMemo(() => history ? dailyProgress(historyRecords, metric) : [],
    [history, historyRecords, metric]);
  const finish = () => {
    if (!session) return;
    update((s) => finishWorkout(s, session.id));
    router.replace({ pathname: '/complete', params: { sessionId: session.id } });
  };
  if (!session || !set || !exercise || !card) console.log('[PERF] WorkoutScreen render (empty)', `${(performance.now() - perfRenderStarted).toFixed(1)}ms`); // PERF-TEMP
  if (!session || !set || !exercise || !card)
    return (
      <Screen title={title} onBack={() => router.replace('/')}>
        <Text style={styles.body}>進行中のカードはありません。</Text>
        {session && (
          <Button
            label="トレーニングを終了"
            onPress={finish}
          />
        )}
        <Button
          label={hasActiveSession ? "ホームへ" : "準備画面へ"}
          secondary
          onPress={() => router.replace(hasActiveSession ? '/' : '/prepare')}
        />
      </Screen>
    );
  const rows = state.sets.filter((s) => s.sessionId === session.id);
  const perfCardsStarted = performance.now(); // PERF-TEMP
  const cards = workoutCards(state, session.id);
  console.log('[PERF] workoutCards', `${(performance.now() - perfCardsStarted).toFixed(1)}ms`); // PERF-TEMP
  const perfSegmentsStarted = performance.now(); // PERF-TEMP
  const exerciseIds = [...new Set(cards.map((item) => rows.find((row) => row.id === item.setId)!.exerciseId))];
  const segments = exerciseIds.map((id) => {
    const exerciseCards = cards.filter((item) => rows.find((row) => row.id === item.setId)?.exerciseId === id);
    return { id, name: state.exercises.find((item) => item.id === id)?.name ?? '種目',
      total: exerciseCards.length, completed: exerciseCards.filter((item) => {
        const row = rows.find((entry) => entry.id === item.setId)!;
        return !row.skippedInputs?.[item.side ?? 'normal'] && (item.side ? row[`${item.side}Completed`] : row.isCompleted);
      }).length };
  });
  console.log('[PERF] segments', `${(performance.now() - perfSegmentsStarted).toFixed(1)}ms`); // PERF-TEMP
  const completedExercises = segments.filter((item) => item.completed === item.total).length;
  const weightKey = `${side}WeightKg` as const;
  const repsKey = `${side}Reps` as const;
  const skipRest = () =>
    update((s) => ({
      ...s,
      workout: s.workout
        ? { ...s.workout, restStartedAt: undefined, restEndsAt: undefined }
        : undefined,
    }));
  const advance = (skip = false) => {
    perfAdvanceStarted = performance.now(); // PERF-TEMP
    const perfSizeState = getState(); // PERF-TEMP
    console.log('[PERF] state size', { sets: perfSizeState.sets.length, sessions: perfSizeState.sessions.length, exercises: perfSizeState.exercises.length, 'cloud.pending': perfSizeState.cloud?.pending.length ?? 0 }); // PERF-TEMP
    if (validBrowsing) {
      const next = cards[position + 1];
      if (next && state.sets.find((row) => row.id === next.setId)?.exerciseId === exercise.id) {
        const nextSet = state.sets.find((row) => row.id === next.setId);
        if (nextSet?.skippedInputs?.[next.side ?? 'normal']) {
          update((s) => reopenSkippedCard(s, next));
          setBrowsing(undefined);
        } else setBrowsing(next.setId === current?.setId && next.side === current?.side ? undefined : next);
      }
      return;
    }
    if (locked.current) return;
    locked.current = true;
    const latest = getState();
    const perfAdvanceWorkoutStarted = performance.now(); // PERF-TEMP
    const changed = advanceWorkout(latest, skip);
    console.log('[PERF] advanceWorkout(latest)', `${(performance.now() - perfAdvanceWorkoutStarted).toFixed(1)}ms`); // PERF-TEMP
    if (changed === latest) { locked.current = false; return; }

    // A wheel edit may still be waiting for disk. Advance from the state after
    // those queued edits, rather than replacing it with this earlier snapshot.
    update((s) => advanceWorkout(s, skip));
    if (!changed.workout)
      router.replace({
        pathname: '/complete',
        params: { sessionId: session.id },
      });
  };
  const position = cards.findIndex(
    (c) => c.setId === card.setId && c.side === card.side,
  );
  const canGoBack = position > 0 && rows.find((row) => row.id === cards[position - 1].setId)?.exerciseId === exercise.id;
  const nextCard = nextExerciseCard(state, card);
  const rest = !validBrowsing && !!progress?.restEndsAt;
  const skipExercise = () => {
    if (locked.current) return;
    locked.current = true;
    const changed = skipToNextExercise(getState(), card);
    update(s => skipToNextExercise(s, card));
    setBrowsing(undefined);
    if (!changed.workout) router.replace({ pathname: '/complete', params: { sessionId: session.id } });
  };
  const change = (setId: number, key: typeof weightKey | typeof repsKey, value: number) => {
    update((s) => updateSet(s, setId, { [key]: value }));
  };
  const goBack = () => {
    const previousCard = cards[position - 1];
    if (!previousCard) return;
    const previousSet = state.sets.find((row) => row.id === previousCard.setId);
    if (previousSet?.exerciseId !== exercise.id) return;
    if (previousSet?.skippedInputs?.[previousCard.side ?? 'normal']) {
      update((s) => reopenSkippedCard(s, previousCard));
      setBrowsing(undefined);
    } else setBrowsing(previousCard);
  };
  const renderCard = (displayCard: WorkoutCard) => {
    const behind = displayCard.setId !== card.setId || displayCard.side !== card.side;
    const displaySet = state.sets.find(row => row.id === displayCard.setId)!;
    const set = behind ? displaySet : storedSet && draft ? { ...storedSet,
      [`${card.side ?? 'normal'}WeightKg`]: draft.weightKg, [`${card.side ?? 'normal'}Reps`]: draft.reps,
    } : displaySet;
    const exercise = state.exercises.find(item => item.id === set.exerciseId)!;
    const cardSide = displayCard.side;
    const side = cardSide ?? 'normal';
    const weightKey = `${side}WeightKg` as const;
    const repsKey = `${side}Reps` as const;
    const exerciseSets = rows.filter(row => row.exerciseId === exercise.id);
    const step = state.exerciseWeightSteps[exercise.id] ?? state.weightStepKg;
    const previous = previousSet(state, exercise.id, session.id, set.setOrder, side, setsBySession);
    return (
          <SwipeCard
            key={exercise.id}
            behind={behind}
            progress={swipeProgress}
            disabled={behind || orderEditor || history}
            isGestureBlocked={() => controlTouch.current}
            onAdvance={skipExercise}
            onSkip={skipExercise}
          >
            <View style={{ flex: 1, borderRadius: 20, backgroundColor: colors.surface,
              shadowColor: '#193039', shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 }}>
            <Card
              style={{
                flex: 1,
                overflow: 'hidden',
                padding: 0,
                backgroundColor: colors.surface,
                marginBottom: 0,
              }}
            >
              {/* Underlay: foreground controls win hit testing; empty edge space navigates. */}
              <View pointerEvents="box-none" testID="workout-card-edges" style={{ position: 'absolute', inset: 0 }}>
                <Pressable accessibilityRole="button" accessibilityLabel="前のセット" disabled={behind || orderEditor || history || !canGoBack}
                  accessibilityState={{ disabled: behind || orderEditor || history || !canGoBack }} onPress={() => { feedback(); goBack(); }}
                  style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '20%', justifyContent: 'center', paddingLeft: 12,
                  }}>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="セット完了して次へ" disabled={behind || orderEditor || history}
                  onPress={() => { feedback(); return advance(); }}
                  style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '20%', justifyContent: 'center', alignItems: 'flex-end', paddingRight: 12,
                  }}>
                </Pressable>
              </View>
              <View pointerEvents="none"><SetProgressBar sets={exerciseSets} currentSet={set} side={cardSide} /></View>
              <View pointerEvents="box-none" style={{ flex: 1.25, minHeight: 80 }}>
                <View pointerEvents="none" style={{ flex: 1, padding: 8 }}>
                  <WorkoutPictogram name={exercise.name} />
                </View>
                <Text pointerEvents="none" style={[styles.title, { textAlign: 'center', paddingHorizontal: 16, marginBottom: 4 }]}>{exercise.name}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="過去の記録を見る"
                  onPress={() => { feedback(); return setHistory(true); }} style={{ position: 'absolute', top: 0, bottom: 0, left: '20%', width: '60%',
                  }} />
              </View>
              <View pointerEvents="box-none" style={{ flex: 1, paddingHorizontal: 12, paddingBottom: 4, minHeight: cardSide ? 208 : 180 }}>
                {cardSide && (
                  <Text pointerEvents="none"
                    style={[
                      styles.body,
                      { textAlign: 'center', color: colors.primary },
                    ]}
                  >
                    {cardSide === 'left' ? '左' : '右'}
                  </Text>
                )}
                {previous && (
                  <Text pointerEvents="none" style={[styles.small, { textAlign: 'center', color: colors.muted }]}>
                    前回 {previous[weightKey] ? `${formatWeight(previous[weightKey], state.weightUnit)} × ` : ''}{previous[repsKey] ?? '—'}回
                  </Text>
                )}
                <View pointerEvents="box-none" {...controlTouchHandlers}
                  style={{
                    flex: 1,
                    minHeight: 124,
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingTop: 40,
                    paddingBottom: 8,
                  }}
                >
                  {behind ? <View testID="workout-next-values" style={{ flex: 1, paddingTop: 8, paddingBottom: 6 }}>
                    <Text style={[styles.small, { textAlign: 'center' }]}>重量 × 回数</Text>
                    <View style={{ height: wheelHeight, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={[styles.title, { textAlign: 'center' }]}>
                        {formatWeight(set[weightKey], state.weightUnit)} × {set[repsKey] ?? '—'}回
                      </Text>
                    </View>
                  </View> : <>
                  <WeightWheel
                    key={`${side}-weight`}
                    resetToken={set.id}
                    label="重量"
                    unit="kg"
                    value={set[weightKey]}
                    highlightValue={previous?.[weightKey]}
                    step={step}
                    disabled={orderEditor || history}
                    onChange={(value) => change(set.id, weightKey, value)}
                  />
                  <View accessible={false} style={{ width: 1, alignSelf: 'stretch', marginVertical: 26, backgroundColor: colors.line }} />
                  <WorkoutNumberWheel
                    key={`${side}-reps`}
                    resetToken={set.id}
                    label="回数"
                    unit="回"
                    value={set[repsKey]}
                    highlightValue={previous?.[repsKey]}
                    step={1}
                    disabled={orderEditor || history}
                    onChange={(value) => change(set.id, repsKey, value)}
                  />
                  </>}
                </View>
              </View>
              <View pointerEvents="box-none" {...controlTouchHandlers}>
              <SwipeActions
                canGoBack={canGoBack}
                onBack={goBack}
                onEdit={() => setOrderEditor(true)}
                reviewing={!!validBrowsing}
                onAdvance={() => advance()}
                onSkip={() => advance(true)}
              />
              </View>
            </Card>
            </View>
          </SwipeCard>
    );
  };
  console.log('[PERF] WorkoutScreen render', `${(performance.now() - perfRenderStarted).toFixed(1)}ms`); // PERF-TEMP
  return (
    <Screen
      scroll={false}
      headerShown={false}
    >
      <View style={[styles.row, { marginBottom: 4 }]}>
        <IconButton label="戻る" icon={<AppIcon name="chevronDown" color={colors.primary} size={28} />} onPress={() => router.replace('/')} />
        <Text numberOfLines={1} style={[styles.title, { flex: 1, textAlign: 'center' }]}>{title}</Text>
        <View style={{ width: 48, alignItems: 'center' }}>
          <Text style={styles.small}>休憩</Text>
          <Switch
            accessibilityLabel="休憩タイマー"
            value={!state.restTimerDisabled}
            style={{ transform: [{ scale: 0.85 }] }}
            onValueChange={(enabled) => { feedback(); return update((s) => ({
              ...s,
              restTimerDisabled: !enabled,
              workout: !enabled && !validBrowsing && s.workout
                ? { ...s.workout, restStartedAt: undefined, restEndsAt: undefined }
                : s.workout,
            })); }}
          />
        </View>
      </View>
      <Text accessibilityLabel={`全${segments.length}種目中${completedExercises}種目完了`} style={[styles.title, { textAlign: 'center', color: colors.primary, marginBottom: 10 }]}>
        {completedExercises} / {segments.length}
      </Text>
      <WorkoutProgressBar segments={segments} currentId={set?.exerciseId} />
      <View style={{ flex: 1, alignSelf: 'stretch', marginHorizontal: -8, paddingBottom: 16 }}>
        {rest ? (
          <RestCard
            key={progress.restEndsAt}
            endsAt={progress.restEndsAt!}
            startedAt={progress.restStartedAt}
            exerciseName={exercise.name}
            next={`${formatWeight(set[weightKey], state.weightUnit)} × ${set[repsKey] ?? '—'}回`}
            onSkip={skipRest}
          />
        ) : (
          [nextCard, card].filter((item): item is WorkoutCard => !!item).map(item => renderCard(item))
        )}

      </View>
      {orderEditor && (
        <WorkoutOrderEditor
          sessionId={session.id}
          onClose={() => { setOrderEditor(false); setBrowsing(undefined); }}
        />
      )}
      {history && (
        <Sheet
          title={`${exercise.name}の記録`}
          onClose={() => { setHistory(false); setHistorySessionId(undefined); }}
        >
          {historySessionId !== undefined ? <>
            <Button label="比較に戻る" secondary onPress={() => setHistorySessionId(undefined)} />
            <SessionDetails sessionIds={[historySessionId]} />
          </> : <>
          <Text style={styles.body}>記録の推移{card.side ? card.side === 'left' ? '（左）' : '（右）' : ''}</Text>
          {!historyBodyweight && <View style={styles.wrap}>
            <Chip label="重量" active={metric === 'weight'} onPress={() => setHistoryMetric('weight')} />
            <Chip label="回数" active={metric === 'reps'} onPress={() => setHistoryMetric('reps')} />
          </View>}
          <Text style={styles.small}>{metric === 'reps' ? '最多回数' : '最大重量'}・直近90日・日ごとの最大値</Text>
          {historyPoints.length ? <ProgressChart points={historyPoints} unit={metric === 'reps' ? '回' : 'kg'} />
            : <Text style={[styles.small, { marginVertical: 16 }]}>直近90日にグラフに表示できる完了記録はありません。</Text>}
          <RecordComparison key={`${exercise.id}:${side}`} records={historyRecords}
            initialWeight={set[weightKey]} initialReps={set[repsKey]}
            onOpenRecord={(record) => setHistorySessionId(record.sessionId)} />
          {older.map((s) => {
            const sets = state.sets.filter(
              (row) =>
                row.sessionId === s.id &&
                row.exerciseId === exercise.id &&
                row.isCompleted &&
                (!card.side || row[`${card.side}Completed`]),
            );
            return sets.length ? (
              <Card key={s.id}>
                <Text style={styles.body}>
                  {new Date(s.startedAt).toLocaleDateString('ja-JP')}
                </Text>
                {sets.map((row) => (
                  <Text key={row.id} style={styles.small}>
                    {row.setOrder}　{formatWeight(row[weightKey], state.weightUnit)} ×{' '}
                    {row[repsKey] ?? '—'}回
                  </Text>
                ))}
              </Card>
            ) : null;
          })}
          {!previousSession && (
            <Text style={styles.small}>過去の記録はありません</Text>
          )}
          </>}
        </Sheet>
      )}
    </Screen>
  );
}

function SetProgressBar({ sets, currentSet, side }: {
  sets: WorkoutSet[];
  currentSet: WorkoutSet;
  side: WorkoutCard['side'];
}) {
  const { colors, styles } = useTheme();
  const ordered = [...sets].sort((a, b) => a.setOrder - b.setOrder);
  const currentIndex = ordered.findIndex((row) => row.id === currentSet.id);
  return <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
    <Text style={[styles.small, { textAlign: 'center', color: colors.primary, marginBottom: 8 }]}>
      セット {currentIndex + 1} / {ordered.length}
    </Text>
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {ordered.map((row, index) => {
        const current = row.id === currentSet.id;
        const completed = !row.skippedInputs?.[side ?? 'normal'] && (side ? row[`${side}Completed`] : row.isCompleted);
        return <View key={row.id}
          accessible
          accessibilityLabel={`セット${index + 1}：${current ? '表示中、' : ''}${completed ? '完了' : '未完了'}`}
          style={{ flex: 1, height: 8, borderRadius: 4,
            backgroundColor: current ? colors.primary : completed ? colors.soft : colors.line,
            borderWidth: current ? 2 : 0, borderColor: colors.primary }} />;
      })}
    </View>
  </View>;
}
