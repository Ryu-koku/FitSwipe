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
import type { WorkoutCard } from '../types';
import { ExercisePictogram } from '../components/ExercisePictogram';
import Svg, { Circle } from 'react-native-svg';
import { useReducedMotion } from '../use-reduced-motion';
import { restRemaining } from '../rest-progress';
import { WorkoutProgressBar } from '../components/WorkoutProgressBar';

export default function WorkoutScreen() {
  const { state, update, getState } = useApp();
  const { colors, styles } = useTheme();
  const [orderEditor, setOrderEditor] = useState(false);
  const [history, setHistory] = useState(false);
  const [exitPrompt, setExitPrompt] = useState(false);
  const [browsing, setBrowsing] = useState<WorkoutCard>();
  const [preparingNext, setPreparingNext] = useState(false);
  const session = activeSession(state);
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
  const nextCard = cards[position + 1];
  const rest = !validBrowsing && !!progress?.restEndsAt;
  const prepareNext = (willAdvance: boolean) => {
    if (!willAdvance || validBrowsing) return;
    setPreparingNext(true);
  };
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
      headerShown={false}
    >
      <View style={[styles.row, { marginBottom: 4 }]}>
        <IconButton label="トレーニングの終了方法を選ぶ" symbol="‹" onPress={() => setExitPrompt(true)} />
        <Text style={[styles.title, { flex: 1, textAlign: 'center' }]}>トレーニング</Text>
        <IconButton label="種目を編集" symbol="⋯" onPress={() => setOrderEditor(true)} />
      </View>
      <Text accessibilityLabel={`全${segments.length}種目中${completedExercises}種目完了`} style={[styles.title, { textAlign: 'center', color: colors.primary, marginBottom: 10 }]}>
        {completedExercises} / {segments.length}
      </Text>
      <WorkoutProgressBar segments={segments} />
      <View style={{ flex: 1, maxHeight: 520, width: '100%', maxWidth: 440, alignSelf: 'center', paddingBottom: 16 }}>
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
              <View style={{ flex: 1, minHeight: 48, padding: 12 }}>
                <ExercisePictogram name={exercise.name} large />
              </View>
              <Text style={[styles.title, { textAlign: 'center', paddingHorizontal: 16, marginBottom: 4 }]}>{exercise.name}</Text>
              <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
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
                    minHeight: 100,
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
                  <TapNumber
                    label="回数"
                    unit="回"
                    value={set[repsKey]}
                    onIncrease={() => change(repsKey, 1)}
                    onDecrease={() => change(repsKey, -1)}
                  />
                </View>
                <View style={styles.row}>
        <IconButton
          label="前のカードへ"
          symbol="‹"
          disabled={position <= 0}
          onPress={() => {
            const previousCard = cards[position - 1];
            const previousSet = state.sets.find((row) => row.id === previousCard?.setId);
            if (previousSet?.skippedInputs?.[previousCard.side ?? 'normal']) {
              update((s) => reopenSkippedCard(s, previousCard));
              setBrowsing(undefined);
            } else setBrowsing(previousCard);
          }}
        />
                  <Text style={[styles.body, { color: colors.primary, fontWeight: '700' }]}>セット {set.setOrder} / {exerciseSets.length}</Text>
                  <IconButton label="次のカードを見る" symbol="›" disabled={position >= cards.findIndex((item) => item.setId === current?.setId && item.side === current?.side)} onPress={() => {
                    const next = cards[position + 1];
                    setBrowsing(next?.setId === current?.setId && next?.side === current?.side ? undefined : next);
                  }} />
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
              </View>
              <SwipeActions reviewing={!!validBrowsing} onAdvance={() => advance()} onSkip={() => advance(true)} />
            </Card>
            </View>
          </SwipeCard>
        )}
        {preparingNext && !rest && nextCard && <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 16, opacity: 0 }}><PreloadedCard card={nextCard} state={state} /></View>}
      </View>
      {exitPrompt && <Sheet title="トレーニングを終了しますか？" popup onClose={() => setExitPrompt(false)}>
        <Text style={styles.body}>終了すると、ここまで完了したセットが今回の記録になります。あとで続ける場合は「ホームに戻る」を選んでください。</Text>
        <Button label="終了して記録を見る" onPress={() => {
          setExitPrompt(false);
          update((s) => finishWorkout(s, session.id));
          router.replace({ pathname: '/complete', params: { sessionId: session.id } });
        }} />
        <Button label="ホームに戻る（あとで再開）" secondary onPress={() => {
          setExitPrompt(false);
          router.replace('/');
        }} />
        <Button label="トレーニングを続ける" secondary onPress={() => setExitPrompt(false)} />
      </Sheet>}
      {orderEditor && (
        <WorkoutOrderEditor
          sessionId={session.id}
          onClose={() => { setOrderEditor(false); setBrowsing(undefined); }}
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
    <View style={[styles.row, { padding: 18, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line }]}>
      <ExercisePictogram name={exercise.name} />
      <Text style={{ color: colors.bg, fontSize: 24, fontWeight: '800', flex: 1 }}>{exercise.name}</Text>
      <Text style={{ color: colors.bg, fontWeight: '700' }}>{set.setOrder}/{exerciseSets.length}</Text>
    </View>
    <View style={{ flex: 1, padding: 16, justifyContent: 'center', alignItems: 'center' }}>
      {card.side && <Text style={[styles.title, { color: colors.primary }]}>{card.side === 'left' ? '左' : '右'}</Text>}
      <Text style={[styles.title, { marginTop: 16 }]}>{formatWeight(weight)} × {reps ?? '—'}回</Text>
    </View>
  </Card>;
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
        backgroundColor: colors.soft,
        borderRadius: 18,
        marginHorizontal: 4,
        marginVertical: 12,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text
        style={{ color: colors.primary, fontSize: 40, fontWeight: '800' }}
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
  startedAt,
  exerciseName,
  next,
  onSkip,
}: {
  endsAt: number;
  startedAt?: number;
  exerciseName: string;
  next: string;
  onSkip: () => void;
}) {
  const { colors, styles } = useTheme();
  const [clock, setClock] = useState(() => Date.now());
  const [fallbackStart] = useState(() => Date.now());
  const reducedMotion = useReducedMotion();
  const latestSkip = useRef(onSkip);
  useEffect(() => {
    latestSkip.current = onSkip;
  }, [onSkip]);
  useEffect(() => {
    const refresh = () => setClock(Date.now());
    const timer = setInterval(refresh, reducedMotion ? 250 : 50);
    const subscription = NativeAppState.addEventListener('change', refresh);
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [reducedMotion]);
  useEffect(() => {
    if (clock >= endsAt + 3000) latestSkip.current();
  }, [clock, endsAt]);
  const { seconds: remaining, fraction } = restRemaining(startedAt ?? fallbackStart, endsAt, clock);
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
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Svg width="100%" height="100%" viewBox="0 0 230 230"
            pointerEvents="none" accessible={false} style={{ position: 'absolute' }}>
            <Circle cx={115} cy={115} r={105} fill="none" stroke={colors.line} strokeWidth={9} />
            {fraction > 0 && <Circle cx={115} cy={115} r={105} fill="none"
              stroke={colors.primary} strokeWidth={9} strokeLinecap="round"
              strokeDasharray={[2 * Math.PI * 105, 2 * Math.PI * 105]}
              strokeDashoffset={2 * Math.PI * 105 * (1 - fraction)}
              rotation={-90} origin="115, 115" />}
          </Svg>
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
