import { indexSessionSets, now, previousSet } from './logic';
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

export function presetExerciseDefaults(exerciseId: number): PresetExerciseConfig {
  return { exerciseId, sets: 3 };
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

export function currentCard(state: AppState, sessionId: number) {
  const cards = workoutCards(state, sessionId);
  const saved = state.workout?.sessionId === sessionId ? state.workout.card : undefined;
  return cards.find((card) => card.setId === saved?.setId && card.side === saved.side)
    ?? cards[0];
}

// Reordering keeps the same card when it still exists in the deck.
export function reorderWorkout(state: AppState, exerciseOrder: number[]): AppState {
  if (!state.workout) return state;
  const card = currentCard(state, state.workout.sessionId);
  const reordered = { ...state, workout: { ...state.workout, exerciseOrder } };
  return card ? atPosition(reordered, card) : reordered;
}

function atPosition(state: AppState, card: WorkoutCard): AppState {
  const progress = state.workout;
  if (!progress) return state;
  const cards = workoutCards(state, progress.sessionId);
  const index = cards.findIndex((item) => item.setId === card.setId && item.side === card.side);
  if (index < 0) return state;
  const visited = new Set(cards.slice(0, index).map((item) => `${item.setId}:${item.side ?? 'normal'}`));
  return {
    ...state,
    sets: state.sets.map((set) => {
      if (set.sessionId !== progress.sessionId) return set;
      const bilateral = state.exercises.find((exercise) => exercise.id === set.exerciseId)?.mode === 'BILATERAL';
      const leftCompleted = bilateral && visited.has(`${set.id}:left`);
      const rightCompleted = bilateral && visited.has(`${set.id}:right`);
      const isCompleted = bilateral ? leftCompleted && rightCompleted : visited.has(`${set.id}:normal`);
      return { ...set, leftCompleted: !!leftCompleted, rightCompleted: !!rightCompleted, isCompleted: !!isCompleted };
    }),
    workout: { ...progress, card, restStartedAt: undefined, restEndsAt: undefined },
  };
}

export function moveToCard(state: AppState, card: WorkoutCard): AppState {
  return atPosition(state, card);
}

// Personal sync can bring another device's open session. Keep following the
// one this device is working on; otherwise resume the first open session.
export function activeSession(state: AppState) {
  const open = state.sessions.filter((s) => s.status === 'IN_PROGRESS');
  return open.find((s) => s.id === state.workout?.sessionId) ?? open[0];
}

export function startWorkout(state: AppState, presetId?: string): AppState {
  const existing = activeSession(state);
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
  const setsBySession = indexSessionSets(state.sets);
  const sets = configs.flatMap((config) =>
    Array.from(
      { length: Math.min(30, Math.max(1, config.sets || 3)) },
      (_, index): WorkoutSet => {
        const exercise = state.exercises.find((e) => e.id === config.exerciseId)!;
        const defaults = exerciseDefaults(exercise);
        const prior = (side: 'normal' | 'left' | 'right') =>
          previousSet(state, config.exerciseId, sessionId, index + 1, side, setsBySession);
        const normal = exercise.mode === 'NORMAL' ? prior('normal') : undefined;
        const left = exercise.mode === 'BILATERAL' ? prior('left') : undefined;
        const right = exercise.mode === 'BILATERAL' ? prior('right') : undefined;
        return {
          id: id++,
          sessionId,
          exerciseId: config.exerciseId,
          setOrder: index + 1,
          ...(exercise.mode === 'BILATERAL'
            ? {
                leftWeightKg: config.leftWeightKg ?? config.weightKg ?? left?.leftWeightKg ?? defaults.leftWeightKg,
                leftReps: config.reps ?? left?.leftReps ?? defaults.reps,
                rightWeightKg: config.rightWeightKg ?? config.weightKg ?? right?.rightWeightKg ?? defaults.rightWeightKg,
                rightReps: config.reps ?? right?.rightReps ?? defaults.reps,
              }
            : {
                normalWeightKg: config.weightKg ?? normal?.normalWeightKg ?? defaults.weightKg,
                normalReps: config.reps ?? normal?.normalReps ?? defaults.reps,
              }),
          leftCompleted: false,
          rightCompleted: false,
          isCompleted: false,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
      },
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
  const timestamp = now();
  return {
    ...state,
    sets: state.sets.map((set) => set.sessionId === sessionId
      ? { ...set, isCompleted: true,
          leftCompleted: state.exercises.find((exercise) => exercise.id === set.exerciseId)?.mode === 'BILATERAL',
          rightCompleted: state.exercises.find((exercise) => exercise.id === set.exerciseId)?.mode === 'BILATERAL',
          updatedAt: timestamp }
      : set),
    sessions: state.sessions.map((s) =>
      s.id === sessionId ? { ...s, status: 'COMPLETED', endedAt: timestamp } : s,
    ),
    workout: undefined,
  };
}

// Pure bulk edit; keep legacy skipped input values readable.
export function updateExerciseSets(
  state: AppState, sessionId: number, exerciseId: number,
  changes: Partial<Pick<WorkoutSet, 'normalWeightKg' | 'normalReps' | 'leftWeightKg' | 'leftReps' | 'rightWeightKg' | 'rightReps'>>,
  timestamp: string,
): AppState {
  return { ...state, sets: state.sets.map((set) => {
    if (set.sessionId !== sessionId || set.exerciseId !== exerciseId || set.isCompleted) return set;
    const patch = { ...changes };
    const skippedInputs = set.skippedInputs ? { ...set.skippedInputs } : undefined;
    for (const side of ['normal', 'left', 'right'] as const) {
      const weight = `${side}WeightKg` as const;
      const reps = `${side}Reps` as const;
      if (side !== 'normal' && set[`${side}Completed`]) {
        delete patch[weight]; delete patch[reps];
      }
      const input = skippedInputs?.[side];
      if (input) skippedInputs![side] = {
        weightKg: weight in patch ? patch[weight] : input.weightKg,
        reps: reps in patch ? patch[reps] : input.reps,
      };
    }
    if (!Object.keys(patch).length) return set;
    return { ...set, ...patch, skippedInputs, updatedAt: timestamp };
  }) };
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
  // Keep legacy skipped input values in sync with edits.
  if (previous.skippedInputs && !('skippedInputs' in changes)) {
    const skippedInputs = { ...previous.skippedInputs };
    for (const side of ['normal', 'left', 'right'] as const) {
      const input = skippedInputs[side];
      if (!input) continue;
      const weightKey = `${side}WeightKg` as const;
      const repsKey = `${side}Reps` as const;
      skippedInputs[side] = {
        weightKg: weightKey in changes ? changes[weightKey] : input.weightKg,
        reps: repsKey in changes ? changes[repsKey] : input.reps,
      };
    }
    changes = { ...changes, skippedInputs };
  }
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
        return { ...set, ...Object.fromEntries(Object.entries(carry).filter(([key]) => {
          const side = key.startsWith('left') ? 'left' : key.startsWith('right') ? 'right' : 'normal';
          return !set.skippedInputs?.[side] && (side === 'normal' || !set[`${side}Completed`]);
        })) };
      return set;
    }),
  };
}

export function advanceWorkout(state: AppState): AppState {
  const progress = state.workout;
  if (!progress) return state;
  const cards = workoutCards(state, progress.sessionId);
  const current = currentCard(state, progress.sessionId);
  const index = cards.findIndex((card) => card.setId === current?.setId && card.side === current.side);
  if (index < 0) return state;
  if (index === cards.length - 1) return finishWorkout(state, progress.sessionId);
  const next = cards[index + 1];
  const fromSet = state.sets.find((set) => set.id === current!.setId)!;
  const nextSet = state.sets.find((set) => set.id === next.setId)!;
  const seconds = !state.restTimerDisabled && fromSet.exerciseId === nextSet.exerciseId &&
    (fromSet.id !== nextSet.id || state.sideSwitchRestExerciseIds.includes(fromSet.exerciseId))
      ? (state.exerciseRestDurations[fromSet.exerciseId] ?? state.restDurationSeconds) : 0;
  const started = Date.now();
  const moved = atPosition(state, next);
  return { ...moved, workout: { ...moved.workout!,
    restStartedAt: seconds > 0 ? started : undefined,
    restEndsAt: seconds > 0 ? started + seconds * 1000 : undefined,
  } };
}

export function nextExerciseCard(state: AppState, from: WorkoutCard) {
  const sessionId = state.workout?.sessionId;
  const set = state.sets.find((row) => row.id === from.setId && row.sessionId === sessionId);
  if (!set || sessionId === undefined) return undefined;
  const cards = workoutCards(state, sessionId);
  const index = cards.findIndex((card) => card.setId === from.setId && card.side === from.side);
  return cards.slice(index + 1).find((card) =>
    state.sets.find((row) => row.id === card.setId)?.exerciseId !== set.exerciseId);
}

export function moveToNextExercise(state: AppState): AppState {
  const progress = state.workout;
  const current = progress && currentCard(state, progress.sessionId);
  const next = current && nextExerciseCard(state, current);
  return next ? atPosition(state, next) : state;
}

export function moveToExercise(state: AppState, exerciseId: number): AppState {
  const progress = state.workout;
  if (!progress) return state;
  const first = workoutCards(state, progress.sessionId).find((card) =>
    state.sets.find((set) => set.id === card.setId && set.sessionId === progress.sessionId)?.exerciseId === exerciseId);
  return first ? atPosition(state, first) : state;
}

export function moveToPreviousExercise(state: AppState): AppState {
  const progress = state.workout;
  if (!progress) return state;
  const cards = workoutCards(state, progress.sessionId);
  const current = currentCard(state, progress.sessionId);
  const index = cards.findIndex((card) => card.setId === current?.setId && card.side === current.side);
  const exerciseId = state.sets.find((set) => set.id === current?.setId)?.exerciseId;
  const previous = cards.slice(0, index).reverse().find((card) =>
    state.sets.find((set) => set.id === card.setId)?.exerciseId !== exerciseId);
  if (!previous) return state;
  const first = cards.find((card) => state.sets.find((set) => set.id === card.setId)?.exerciseId ===
    state.sets.find((set) => set.id === previous.setId)?.exerciseId);
  return first ? atPosition(state, first) : state;
}

export function deleteWorkoutSet(state: AppState, setId: number): AppState {
  const progress = state.workout;
  const row = state.sets.find((set) => set.id === setId && set.sessionId === progress?.sessionId);
  if (!progress || !row) return state;
  const cards = workoutCards(state, progress.sessionId);
  const current = currentCard(state, progress.sessionId);
  const index = cards.findIndex((card) => card.setId === current?.setId && card.side === current.side);
  const remaining = cards.filter((card) => card.setId !== setId);
  const next = remaining[index] ?? remaining.at(-1);
  const exerciseOrder = progress.exerciseOrder.filter((id) => id !== row.exerciseId ||
    state.sets.some((set) => set.sessionId === progress.sessionId && set.exerciseId === id && set.id !== setId));
  const changed = { ...state, sets: state.sets.filter((set) => set.id !== setId),
    workout: { ...progress, exerciseOrder } };
  return next ? atPosition(changed, next) : finishWorkout(changed, progress.sessionId);
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
  const exercise = state.exercises.find((item) => item.id === exerciseId);
  const defaults = exercise ? exerciseDefaults(exercise) : undefined;
  const additions = Array.from(
    { length: count - rows.length },
    (_, index): WorkoutSet => ({
      ...(previous ?? (exercise?.mode === 'BILATERAL' ? {
        leftWeightKg: defaults?.leftWeightKg, rightWeightKg: defaults?.rightWeightKg,
        leftReps: defaults?.reps, rightReps: defaults?.reps,
      } : { normalWeightKg: defaults?.weightKg, normalReps: defaults?.reps })),
      skippedInputs: undefined,
      finalSkippedSide: undefined,
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
