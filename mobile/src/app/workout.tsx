import React, { useEffect, useRef, useState } from 'react';
import {
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
  Chip,
  IconButton,
  Screen,
  Sheet,
  useTheme,
} from '../ui';
import {
  advanceWorkout,
  currentCard,
  reopenSkippedCard,
  activeSession,
  finishWorkout,
  startWorkout,
  updateSet,
  workoutCards,
} from '../workout';
import { SwipeCard, SwipeActions } from '../components/SwipeCard';
import { WorkoutOrderEditor } from '../components/WorkoutOrderEditor';
import type { WorkoutCard, WorkoutSet } from '../types';
import { ExercisePictogram } from '../components/ExercisePictogram';
import { RestCard } from '../components/RestCard';
import { ProgressChart } from '../components/ProgressChart';
import { RecordComparison } from '../components/RecordComparison';
import { SessionDetails } from '../components/SessionDetails';
import { WorkoutProgressBar } from '../components/WorkoutProgressBar';
import { WorkoutNumberWheel } from '../components/WorkoutNumberWheel';
import { dailyProgress, exerciseRecords, isBodyweight, progressIndex } from '../home-progress';

export default function WorkoutScreen() {
  const { state, update, getState } = useApp();
  const { colors, styles } = useTheme();
  const [orderEditor, setOrderEditor] = useState(false);
  const [history, setHistory] = useState(false);
  const [historySessionId, setHistorySessionId] = useState<number>();
  const [historyMetric, setHistoryMetric] = useState<'weight' | 'reps'>('weight');
  const [exitPrompt, setExitPrompt] = useState(false);
  const [browsing, setBrowsing] = useState<WorkoutCard>();
  const [preparingNext, setPreparingNext] = useState(false);
  const session = activeSession(state);
  const title = state.rooms.find(room => room.id === state.activeRoomId)?.name
    ?? state.presets.find(preset => preset.id === session?.presetId)?.name
    ?? 'トレーニング';
  const progress = state.workout;
  const current = session ? currentCard(state, session.id) : undefined;
  const validBrowsing = browsing && state.sets.some((item) => item.id === browsing.setId && item.sessionId === session?.id) ? browsing : undefined;
  const card = validBrowsing ?? current;
  const storedSet = state.sets.find((s) => s.id === card?.setId);
  const draft = storedSet?.skippedInputs?.[card?.side ?? 'normal'];
  const set = storedSet && draft ? { ...storedSet,
    [`${card?.side ?? 'normal'}WeightKg`]: draft.weightKg,
    [`${card?.side ?? 'normal'}Reps`]: draft.reps,
  } : storedSet;
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
  const exitConfirmation = session && exitPrompt && (
    <Sheet title="終了しますか？" popup onClose={() => setExitPrompt(false)}>
      <Text style={styles.body}>ここまでの記録を保存します。</Text>
      <Button label="終了して記録を見る" onPress={() => {
        setExitPrompt(false);
        update((s) => finishWorkout(s, session.id));
        router.replace({ pathname: '/complete', params: { sessionId: session.id } });
      }} />
    </Sheet>
  );
  if (!session || !set || !exercise || !card)
    return (
      <Screen title={title} onBack={() => router.replace('/prepare')}>
        <Text style={styles.body}>進行中のカードはありません。</Text>
        {session && (
          <Button
            label="トレーニングを終了"
            onPress={() => setExitPrompt(true)}
          />
        )}
        <Button
          label="準備画面へ"
          secondary
          onPress={() => router.replace('/prepare')}
        />
        {exitConfirmation}
      </Screen>
    );
  const rows = state.sets.filter((s) => s.sessionId === session.id);
  const cards = workoutCards(state, session.id);
  const exerciseIds = [...new Set(cards.map((item) => rows.find((row) => row.id === item.setId)!.exerciseId))];
  const segments = exerciseIds.map((id) => {
    const exerciseCards = cards.filter((item) => rows.find((row) => row.id === item.setId)?.exerciseId === id);
    return { id, name: state.exercises.find((item) => item.id === id)?.name ?? '種目',
      total: exerciseCards.length, completed: exerciseCards.filter((item) => {
        const row = rows.find((entry) => entry.id === item.setId)!;
        return !row.skippedInputs?.[item.side ?? 'normal'] && (item.side ? row[`${item.side}Completed`] : row.isCompleted);
      }).length };
  });
  const completedExercises = segments.filter((item) => item.completed === item.total).length;
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
  const side = card.side ?? 'normal';
  const historyRecords = history
    ? exerciseRecords(progressIndex(state), exercise.id, side === 'left' ? 1 : side === 'right' ? 2 : 0)
    : [];
  const historyBodyweight = isBodyweight(historyRecords);
  const metric = historyBodyweight ? 'reps' : historyMetric;
  const historyPoints = history ? dailyProgress(historyRecords, metric) : [];
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
    if (validBrowsing) {
      const next = cards[position + 1];
      if (next) {
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
    const changed = advanceWorkout(getState(), skip);
    setPreparingNext(false);
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
  const nextCard = cards[position + 1];
  const rest = !validBrowsing && !!progress?.restEndsAt;
  const prepareNext = (willAdvance: boolean) => {
    if (!willAdvance || validBrowsing) return;
    setPreparingNext(true);
  };
  const change = (key: typeof weightKey | typeof repsKey, value: number) => {
    update((s) => updateSet(s, set.id, { [key]: value }));
  };
  const goBack = () => {
    const previousCard = cards[position - 1];
    if (!previousCard) return;
    const previousSet = state.sets.find((row) => row.id === previousCard.setId);
    if (previousSet?.skippedInputs?.[previousCard.side ?? 'normal']) {
      update((s) => reopenSkippedCard(s, previousCard));
      setBrowsing(undefined);
    } else setBrowsing(previousCard);
  };
  return (
    <Screen
      scroll={false}
      headerShown={false}
    >
      <View style={[styles.row, { marginBottom: 4 }]}>
        <IconButton label="戻る" symbol="‹" onPress={() => router.replace('/prepare')} />
        <Text numberOfLines={1} style={[styles.title, { flex: 1, textAlign: 'center' }]}>{title}</Text>
        <IconButton label="トレーニングを終了" symbol="終了" onPress={() => setExitPrompt(true)} />
      </View>
      <Text accessibilityLabel={`全${segments.length}種目中${completedExercises}種目完了`} style={[styles.title, { textAlign: 'center', color: colors.primary, marginBottom: 10 }]}>
        {completedExercises} / {segments.length}
      </Text>
      <WorkoutProgressBar segments={segments} />
      <View style={{ flex: 1, width: '100%', maxWidth: 440, alignSelf: 'center', paddingBottom: 16 }}>
        {rest ? (
          <RestCard
            key={progress.restEndsAt}
            endsAt={progress.restEndsAt!}
            startedAt={progress.restStartedAt}
            exerciseName={exercise.name}
            next={`${formatWeight(set[weightKey])} × ${set[repsKey] ?? '—'}回`}
            onSkip={skipRest}
          />
        ) : (
          <SwipeCard
            key={`${set.id}-${side}-${!!browsing}`}
            onAdvance={() => advance()}
            onSkip={() => advance(true)}
            onSwipeStart={prepareNext}
          >
            <Pressable accessible={false} onPress={() => setHistory(true)} style={{ flex: 1, borderRadius: 20, backgroundColor: colors.surface,
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
              <SetProgressBar sets={exerciseSets} currentSet={set} side={card.side} />
              <Pressable accessibilityRole="button" accessibilityLabel={`${exercise.name}の過去の記録を見る`} onPress={() => setHistory(true)} style={{ flex: 1.25, minHeight: 80 }}>
                <View style={{ flex: 1, padding: 8 }}>
                  <ExercisePictogram name={exercise.name} large animate={!orderEditor && !history && !exitPrompt} />
                </View>
                <Text style={[styles.title, { textAlign: 'center', paddingHorizontal: 16, marginBottom: 4 }]}>{exercise.name}</Text>
              </Pressable>
              <View style={{ flex: 1, paddingHorizontal: 12, paddingBottom: 4, minHeight: card.side ? 208 : 180 }}>
                {card.side && (
                  <Text
                    style={[
                      styles.body,
                      { textAlign: 'center', color: colors.primary },
                    ]}
                  >
                    {card.side === 'left' ? '左' : '右'}
                  </Text>
                )}
                <View
                  style={{
                    flex: 1,
                    minHeight: 124,
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingTop: 40,
                    paddingBottom: 8,
                  }}
                >
                  <WorkoutNumberWheel
                    key={`${set.id}-${side}-weight`}
                    label="重量"
                    unit="kg"
                    value={set[weightKey]}
                    step={step}
                    disabled={orderEditor || history || exitPrompt}
                    onChange={(value) => change(weightKey, value)}
                  />
                  <View accessible={false} style={{ width: 1, alignSelf: 'stretch', marginVertical: 26, backgroundColor: colors.line }} />
                  <WorkoutNumberWheel
                    key={`${set.id}-${side}-reps`}
                    label="回数"
                    unit="回"
                    value={set[repsKey]}
                    step={1}
                    disabled={orderEditor || history || exitPrompt}
                    onChange={(value) => change(repsKey, value)}
                  />
                </View>
              </View>
              <SwipeActions
                canGoBack={position > 0}
                onBack={goBack}
                onEdit={() => setOrderEditor(true)}
                reviewing={!!validBrowsing}
                onAdvance={() => advance()}
                onSkip={() => advance(true)}
              />
            </Card>
            </Pressable>
          </SwipeCard>
        )}
        {preparingNext && !rest && nextCard && <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 16, opacity: 0 }}><PreloadedCard card={nextCard} state={state} /></View>}
      </View>
      {exitConfirmation}
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
            backgroundColor: completed ? colors.primary : current ? colors.soft : colors.line,
            borderWidth: current ? 2 : 0, borderColor: colors.primary }} />;
      })}
    </View>
  </View>;
}

function PreloadedCard({ card, state }: { card: WorkoutCard; state: ReturnType<typeof useApp>['state'] }) {
  const { colors, styles } = useTheme();
  const set = state.sets.find((row) => row.id === card.setId);
  const exercise = state.exercises.find((item) => item.id === set?.exerciseId);
  if (!set || !exercise) return null;
  const side = card.side ?? 'normal';
  const weight = set[`${side}WeightKg` as const];
  const reps = set[`${side}Reps` as const];
  const exerciseSets = state.sets.filter((row) => row.sessionId === set.sessionId && row.exerciseId === exercise.id);
  return <Card style={{ flex: 1, overflow: 'hidden', padding: 0, backgroundColor: colors.soft, marginBottom: 0 }}>
    <SetProgressBar sets={exerciseSets} currentSet={set} side={card.side} />
    <View style={[styles.row, { padding: 18, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line }]}>
      <ExercisePictogram name={exercise.name} animate={false} />
      <Text style={{ color: colors.bg, fontSize: 24, fontWeight: '800', flex: 1 }}>{exercise.name}</Text>
    </View>
    <View style={{ flex: 1, padding: 16, justifyContent: 'center', alignItems: 'center' }}>
      {card.side && <Text style={[styles.title, { color: colors.primary }]}>{card.side === 'left' ? '左' : '右'}</Text>}
      <Text style={[styles.title, { marginTop: 16 }]}>{formatWeight(weight)} × {reps ?? '—'}回</Text>
    </View>
  </Card>;
}
