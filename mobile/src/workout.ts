import { now } from './logic';
import type {
  AppState,
  Exercise,
  PresetExerciseConfig,
  WorkoutCard,
  WorkoutSet,
} from './types';

export const numeric = (raw: string, integer = false) => {
  if (!raw.trim()) return undefined;
  const value = Number(raw.replace(',', '.'));
  return Number.isFinite(value) &&
    value >= 0 &&
    (!integer || Number.isInteger(value))
    ? value
    : undefined;
};

export function exerciseDefaults(exercise: Exercise): PresetExerciseConfig {
  const weights: Record<string, number> = {
    ベンチプレス: 55,
    'bench press': 55,
    ラットプルダウン: 50,
    'lat pulldown': 50,
    レッグプレス: 105,
    'leg press': 105,
    'horizontal leg press': 105,
    スクワット: 72.5,
    squat: 72.5,
  };
  const weight = weights[exercise.name.trim().toLowerCase()] ?? 0;
  return {
    exerciseId: exercise.id,
    weightKg: weight,
    leftWeightKg: weight,
    rightWeightKg: weight,
    reps: 10,
    sets: 3,
  };
}

export function nextId(state: AppState) {
  return Math.max(
    state.nextId,
    ...state.sessions.map((s) => s.id + 1),
    ...state.sets.map((s) => s.id + 1),
    ...state.exercises.map((e) => e.id + 1),
  );
}

export function workoutCards(
  state: AppState,
  sessionId: number,
): WorkoutCard[] {
  const sets = state.sets.filter((s) => s.sessionId === sessionId);
  const ids = [
    ...new Set([
      ...(state.workout?.sessionId === sessionId
        ? state.workout.exerciseOrder
        : []),
      ...sets.map((s) => s.exerciseId),
    ]),
  ];
  return ids.flatMap((id) =>
    sets
      .filter((s) => s.exerciseId === id)
      .sort((a, b) => a.setOrder - b.setOrder)
      .flatMap((set): WorkoutCard[] => {
        const exercise = state.exercises.find((e) => e.id === id);
        return exercise?.mode === 'BILATERAL'
          ? (state.leftFirstExerciseIds.includes(id)
              ? (['left', 'right'] as const)
              : (['right', 'left'] as const)
            ).map((side) => ({ setId: set.id, side }))
          : [{ setId: set.id }];
      }),
  );
}

export function cardCompleted(state: AppState, card: WorkoutCard) {
  const set = state.sets.find((s) => s.id === card.setId);
  return !set || (card.side ? set[`${card.side}Completed`] : set.isCompleted);
}

export function currentCard(state: AppState, sessionId: number) {
  const saved =
    state.workout?.sessionId === sessionId ? state.workout.card : undefined;
  return saved && !cardCompleted(state, saved)
    ? saved
    : workoutCards(state, sessionId).find(
        (card) => !cardCompleted(state, card),
      );
}

export function startWorkout(state: AppState, presetId?: string): AppState {
  const existing = state.sessions.find((s) => s.status === 'IN_PROGRESS');
  if (existing) {
    if (state.workout?.sessionId === existing.id) return state;
    return {
      ...state,
      workout: {
        sessionId: existing.id,
        exerciseOrder: [
          ...new Set(
            state.sets
              .filter((s) => s.sessionId === existing.id)
              .map((s) => s.exerciseId),
          ),
        ],
        history: [],
      },
    };
  }
  const preset =
    state.presets.find((p) => p.id === (presetId ?? state.selectedPresetId)) ??
    state.presets[0];
  const configs =
    preset?.exercises.filter((config) =>
      state.exercises.some((e) => e.id === config.exerciseId && !e.archived),
    ) ?? [];
  if (!configs.length) throw new Error('プリセットに種目を設定してください');
  let id = nextId(state);
  const sessionId = id++;
  const timestamp = now();
  const sets = configs.flatMap((config) =>
    Array.from(
      { length: Math.min(30, Math.max(1, config.sets || 3)) },
      (_, index): WorkoutSet => ({
        id: id++,
        sessionId,
        exerciseId: config.exerciseId,
        setOrder: index + 1,
        ...(state.exercises.find((e) => e.id === config.exerciseId)?.mode ===
        'BILATERAL'
          ? {
              leftWeightKg: config.leftWeightKg ?? config.weightKg,
              leftReps: config.reps,
              rightWeightKg: config.rightWeightKg ?? config.weightKg,
              rightReps: config.reps,
            }
          : { normalWeightKg: config.weightKg, normalReps: config.reps }),
        leftCompleted: false,
        rightCompleted: false,
        isCompleted: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
    ),
  );
  return {
    ...state,
    nextId: id,
    selectedPresetId: preset.id,
    sessions: [
      ...state.sessions,
      {
        id: sessionId,
        startedAt: timestamp,
        status: 'IN_PROGRESS',
        presetId: preset.id,
      },
    ],
    sets: [...state.sets, ...sets],
    workout: {
      sessionId,
      exerciseOrder: configs.map((c) => c.exerciseId),
      history: [],
    },
  };
}

export function finishWorkout(state: AppState, sessionId: number): AppState {
  // Kotlin finishSession changes only the session, never the unperformed sets.
  return {
    ...state,
    sessions: state.sessions.map((s) =>
      s.id === sessionId ? { ...s, status: 'COMPLETED', endedAt: now() } : s,
    ),
    workout: undefined,
  };
}

export function updateSet(
  state: AppState,
  setId: number,
  changes: Partial<WorkoutSet>,
): AppState {
  const previous = state.sets.find((s) => s.id === setId);
  if (!previous) return state;
  const timestamp = now();
  const weights = ['normalWeightKg', 'leftWeightKg', 'rightWeightKg'] as const;
  const carry = Object.fromEntries(
    weights
      .filter(
        (key) => changes[key] !== undefined && changes[key] !== previous[key],
      )
      .map((key) => [key, changes[key]]),
  );
  return {
    ...state,
    sets: state.sets.map((set) => {
      if (set.id === setId) return { ...set, ...changes, updatedAt: timestamp };
      if (
        set.sessionId === previous.sessionId &&
        set.exerciseId === previous.exerciseId &&
        set.setOrder > previous.setOrder &&
        !set.isCompleted
      )
        return { ...set, ...carry };
      return set;
    }),
  };
}

export function advanceWorkout(state: AppState, skip = false): AppState {
  const progress = state.workout;
  if (!progress) return state;
  const card = currentCard(state, progress.sessionId);
  const set = state.sets.find((s) => s.id === card?.setId);
  if (!set || !card) return state;
  const changes: Partial<WorkoutSet> = card.side
    ? {
        [`${card.side}Completed`]: true,
        ...(skip
          ? {
              [`${card.side}WeightKg`]: undefined,
              [`${card.side}Reps`]: undefined,
            }
          : {}),
      }
    : {
        isCompleted: true,
        ...(skip ? { normalWeightKg: undefined, normalReps: undefined } : {}),
      };
  if (card.side)
    changes.isCompleted =
      card.side === 'left' ? set.rightCompleted : set.leftCompleted;
  const changed = updateSet(state, set.id, changes);
  const next = workoutCards(changed, progress.sessionId).find(
    (item) => !cardCompleted(changed, item),
  );
  if (!next) return finishWorkout(changed, progress.sessionId);
  const nextSet = changed.sets.find((s) => s.id === next.setId)!;
  const sideSwitch = next.setId === set.id;
  const seconds =
    !skip &&
    !state.restTimerDisabledExerciseIds.includes(set.exerciseId) &&
    nextSet.exerciseId === set.exerciseId &&
    (!sideSwitch || state.sideSwitchRestExerciseIds.includes(set.exerciseId))
      ? (state.exerciseRestDurations[set.exerciseId] ??
        state.restDurationSeconds)
      : 0;
  const started = Date.now();
  return {
    ...changed,
    workout: {
      ...progress,
      card: next,
      history: [...progress.history, { card, set: { ...set } }],
      restStartedAt: seconds > 0 ? started : undefined,
      restEndsAt: seconds > 0 ? started + seconds * 1000 : undefined,
    },
  };
}

export function undoWorkout(state: AppState): AppState {
  const progress = state.workout;
  const previous = progress?.history.at(-1);
  if (!progress || !previous) return state;
  return {
    ...state,
    sets: state.sets.map((s) => (s.id === previous.set.id ? previous.set : s)),
    workout: {
      ...progress,
      card: previous.card,
      history: progress.history.slice(0, -1),
      restStartedAt: undefined,
      restEndsAt: undefined,
    },
  };
}

export function resizeSets(
  state: AppState,
  sessionId: number,
  exerciseId: number,
  requested: number,
): AppState {
  const rows = state.sets
    .filter((s) => s.sessionId === sessionId && s.exerciseId === exerciseId)
    .sort((a, b) => a.setOrder - b.setOrder);
  const completed = rows.filter(
    (s) => s.isCompleted || s.leftCompleted || s.rightCompleted,
  );
  const count = Math.min(30, Math.max(1, completed.length, requested));
  if (count < rows.length) {
    const remove = rows
      .filter((s) => !s.isCompleted && !s.leftCompleted && !s.rightCompleted)
      .slice(-(rows.length - count))
      .map((s) => s.id);
    return { ...state, sets: state.sets.filter((s) => !remove.includes(s.id)) };
  }
  const previous =
    rows.at(-1) ??
    state.sets
      .filter((s) => s.exerciseId === exerciseId && s.isCompleted)
      .sort(
        (a, b) =>
          (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '') || b.id - a.id,
      )[0];
  let id = nextId(state);
  const timestamp = now();
  const additions = Array.from(
    { length: count - rows.length },
    (_, index): WorkoutSet => ({
      ...previous,
      id: id++,
      sessionId,
      exerciseId,
      setOrder: (rows.at(-1)?.setOrder ?? 0) + index + 1,
      isCompleted: false,
      leftCompleted: false,
      rightCompleted: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    }),
  );
  return { ...state, nextId: id, sets: [...state.sets, ...additions] };
}
