import { useTour, useTourTarget } from '../tour';
import { WeightWheel } from '../components/WeightWheel';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  Switch,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useApp } from '../context';
import { formatWeight, indexSessionSets, localDay, previousSessionSets, previousSet } from '../logic';
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
  moveToNextExercise,
  moveToPreviousExercise,
  moveToExercise,
  moveToCard,
  deleteWorkoutSet,
  currentCard,
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

export default function WorkoutScreen() {
  const tour = useTour();
  const weightTarget = useTourTarget('weight');
  const repsTarget = useTourTarget('reps');
  const advanceTarget = useTourTarget('advance');
  const exerciseTarget = useTourTarget('exercise');
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
  const [swipeProgress] = useState(() => new Animated.Value(0));
  const session = activeSession(state);
  const hasActiveSession = state.sessions.some((s) => s.status === 'IN_PROGRESS');
  const title = state.rooms.find(room => room.id === state.activeRoomId)?.name
    ?? state.presets.find(preset => preset.id === session?.presetId)?.name
    ?? 'トレーニング';
  const progress = state.workout;
  const current = useMemo(() => session ? currentCard(state, session.id) : undefined, [state, session]);
  const card = current;
  const cardSetId = card?.setId;
  const set = useMemo(() => state.sets.find(s => s.id === cardSetId), [state.sets, cardSetId]);
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
  const cards = workoutCards(state, session.id);
  const exerciseIds = [...new Set(cards.map((item) => rows.find((row) => row.id === item.setId)!.exerciseId))];
  const currentExerciseIndex = exerciseIds.indexOf(exercise.id);
  const segments = exerciseIds.map((id) => ({ id,
    name: state.exercises.find((item) => item.id === id)?.name ?? '種目',
  }));
  const exercisePosition = currentExerciseIndex + 1;
  const weightKey = `${side}WeightKg` as const;
  const repsKey = `${side}Reps` as const;
  const skipRest = () =>
    update((s) => ({
      ...s,
      workout: s.workout
        ? { ...s.workout, restStartedAt: undefined, restEndsAt: undefined }
        : undefined,
    }));
  const position = cards.findIndex((c) => c.setId === card.setId && c.side === card.side);
  const canGoBack = position > 0;
  const previousExerciseCard = cards.slice(0, position).reverse().find((item) =>
    rows.find((row) => row.id === item.setId)?.exerciseId !== exercise.id);
  const nextCard = cards[position + 1];
  const rest = !!progress?.restEndsAt;
  const advance = () => {
    if (locked.current) return;
    locked.current = true;
    tour.notify('advanced');
    const changed = advanceWorkout(getState());
    update((s) => advanceWorkout(s));
    if (!changed.workout) router.replace({ pathname: '/complete', params: { sessionId: session.id } });
  };
  const goBack = () => {
    const previous = cards[position - 1];
    if (previous) update((s) => moveToCard(s, previous));
  };
  const goToPreviousExercise = () => update(moveToPreviousExercise);
  const goToNextExercise = () => {
    tour.notify('exercise-moved');
    update(moveToNextExercise);
  };
  const removeSet = (setId: number) => {
    const changed = deleteWorkoutSet(getState(), setId);
    update((s) => deleteWorkoutSet(s, setId));
    if (!changed.workout) router.replace({ pathname: '/complete', params: { sessionId: session.id } });
  };
  const change = (setId: number, key: typeof weightKey | typeof repsKey, value: number) => {
    if (value !== set[key]) tour.notify(key === weightKey ? 'weight-changed' : 'reps-changed');
    update((s) => updateSet(s, setId, { [key]: value }));
  };
  const renderCard = (displayCard: WorkoutCard) => {
    const behind = displayCard.setId !== card.setId || displayCard.side !== card.side;
    const displaySet = state.sets.find(row => row.id === displayCard.setId)!;
    const set = displaySet;
    const exercise = state.exercises.find(item => item.id === set.exerciseId)!;
    const cardSide = displayCard.side;
    const side = cardSide ?? 'normal';
    const weightKey = `${side}WeightKg` as const;
    const repsKey = `${side}Reps` as const;
    const exerciseSets = rows.filter(row => row.exerciseId === exercise.id);
    const step = state.exerciseWeightSteps[exercise.id] ?? state.weightStepKg;
    const previous = previousSet(state, exercise.id, session.id, set.setOrder, side, setsBySession);
    const previousSets = previousSessionSets(state, exercise.id, session.id, side, setsBySession);
    return (
          <SwipeCard
            tourTarget={behind ? undefined : exerciseTarget}
            key={`${displayCard.setId}-${displayCard.side ?? 'normal'}`}
            resetToken={`${displayCard.setId}-${displayCard.side ?? 'normal'}`}
            behind={behind}
            progress={swipeProgress}
            disabled={behind || orderEditor || history}
            isGestureBlocked={() => controlTouch.current}
            onAdvance={() => advance()}
            onSwipeLeft={() => advance()}
            onSwipeRight={canGoBack ? goBack : null}
            onSwipeUp={nextExerciseCard(state, displayCard) ? goToNextExercise : null}
            onSwipeDown={previousExerciseCard ? goToPreviousExercise : null}
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
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View pointerEvents="box-none" {...controlTouchHandlers} style={{ flex: 1 }}><SetProgressBar sets={exerciseSets} currentSet={set} side={cardSide}
                  onSelect={(setId) => { update((s) => moveToCard(s, { setId, side: cardSide })); }} disabled={behind} /></View>
                <Pressable accessibilityRole="button" accessibilityLabel="セットを削除" onPress={() => { feedback(); removeSet(set.id); }}
                  style={{ padding: 12 }}><AppIcon name="trash" color={colors.muted} size={22} /></Pressable>
              </View>
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
                {previousSets.length > 0 && (
                  <Text pointerEvents="none" style={[styles.small, { textAlign: 'center', color: colors.muted, flexShrink: 1 }]}>
                    前回{' '}{previousSets.map((row, index) => (
                      <Text key={row.id} style={row.id === previous?.id ? { color: colors.primary, fontWeight: 'bold' } : undefined}>
                        {index > 0 ? ' / ' : ''}{row[weightKey] ? `${formatWeight(row[weightKey], state.weightUnit)} × ` : ''}{row[repsKey] ?? '—'}回
                      </Text>
                    ))}
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
                  <WeightWheel
                    tourTarget={weightTarget}
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
                    tourTarget={repsTarget}
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
                </View>
              </View>
              <View pointerEvents="box-none" {...controlTouchHandlers}>
              <SwipeActions
                tourTarget={behind ? undefined : advanceTarget}
                canGoBack={canGoBack}
                onBack={goBack}
                onEdit={() => setOrderEditor(true)}
                onAdvance={() => advance()}
              />
              </View>
            </Card>
            </View>
          </SwipeCard>
    );
  };
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
              workout: !enabled && s.workout
                ? { ...s.workout, restStartedAt: undefined, restEndsAt: undefined }
                : s.workout,
            })); }}
          />
        </View>
      </View>
      <Text accessibilityLabel={`全${segments.length}種目中${exercisePosition}種目目`} style={[styles.title, { textAlign: 'center', color: colors.primary, marginBottom: 10 }]}>
        {exercisePosition} / {segments.length}
      </Text>
      <WorkoutProgressBar segments={segments} currentId={set?.exerciseId} onSelect={(exerciseId) => update((s) => moveToExercise(s, exerciseId))} />
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
          [nextCard, card].filter((item): item is WorkoutCard => !!item).reverse().map(item => renderCard(item))
        )}

      </View>
      {orderEditor && (
        <WorkoutOrderEditor
          sessionId={session.id}
          onClose={() => { setOrderEditor(false); }}
          onJumpToSet={(target) => { update((s) => moveToCard(s, target)); setOrderEditor(false); }}
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

function SetProgressBar({ sets, currentSet, side, onSelect, disabled }: {
  sets: WorkoutSet[];
  currentSet: WorkoutSet;
  side: WorkoutCard['side'];
  onSelect: (setId: number) => void;
  disabled: boolean;
}) {
  const { colors, styles } = useTheme();
  const ordered = [...sets].sort((a, b) => a.setOrder - b.setOrder);
  const currentIndex = ordered.findIndex((row) => row.id === currentSet.id);
  return <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
    <Text style={[styles.small, { textAlign: 'center', color: colors.primary, marginBottom: 8 }]}>
      セット {currentIndex + 1} / {ordered.length}
    </Text>
    <View style={{ flexDirection: 'row', gap: 4, paddingVertical: 12, marginVertical: -12 }}>
      {ordered.map((row, index) => {
        const current = row.id === currentSet.id;
        const completed = index < currentIndex;
        const style = { flex: 1, height: 8, borderRadius: 4,
          backgroundColor: current ? colors.primary : completed ? colors.soft : colors.line,
          borderWidth: current ? 2 : 0, borderColor: colors.primary };
        return completed && !disabled ? <Pressable key={row.id} accessibilityRole="button"
          accessibilityLabel={`セット${index + 1}に戻る`} hitSlop={{ top: 12, bottom: 12 }}
          onPress={() => { feedback(); onSelect(row.id); }} style={style} /> : <View key={row.id}
          accessible
          accessibilityLabel={`セット${index + 1}：${current ? '表示中、' : ''}${completed ? '通過済み' : '未到達'}`}
          style={style} />;
      })}
    </View>
  </View>;
}
