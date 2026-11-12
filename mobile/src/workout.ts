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
  return !set || !!set.skippedInputs?.[card.side ?? 'normal'] ||
    (card.side ? set[`${card.side}Completed`] : set.isCompleted);
}

export function currentCard(state: AppState, sessionId: number) {
  const saved =
    state.workout?.sessionId === sessionId ? state.workout.card : undefined;
  return saved && state.sets.some((set) => set.id === saved.setId && set.sessionId === sessionId)
    ? saved
    : workoutCards(state, sessionId).find(
        (card) => !cardCompleted(state, card),
      );
}

// A reorder changes the next displayed card, without resetting rest or set data.
export function reorderWorkout(state: AppState, exerciseOrder: number[]): AppState {
  if (!state.workout) return state;
  return { ...state, workout: { ...state.workout, exerciseOrder, card: undefined } };
}

// Revisit a skipped card as editable work, keeping every other set intact.
export function reopenSkippedCard(state: AppState, card: WorkoutCard): AppState {
  const set = state.sets.find((row) => row.id === card.setId);
  const side = card.side ?? 'normal';
  const input = set?.skippedInputs?.[side];
  if (!set || !input || state.sessions.some((session) =>
    session.status === 'IN_PROGRESS' && session.id !== set.sessionId)) return state;
  const skippedInputs = { ...set.skippedInputs };
  delete skippedInputs[side];
  return {
    ...state,
    sessions: state.sessions.map((session) => session.id === set.sessionId
      ? { ...session, status: 'IN_PROGRESS', endedAt: undefined }
      : session),
    sets: state.sets.map((row) => row.id === set.id ? {
      ...row, skippedInputs, finalSkippedSide: undefined, [`${side}WeightKg`]: input.weightKg,
      [`${side}Reps`]: input.reps, isCompleted: false, updatedAt: now(),
      ...(card.side ? { [`${side}Completed`]: false } : {}),
    } : row),
    workout: {
      ...(state.workout?.sessionId === set.sessionId ? state.workout : {
        sessionId: set.sessionId,
        exerciseOrder: [...new Set(state.sets.filter((row) => row.sessionId === set.sessionId).map((row) => row.exerciseId))],
        history: [],
      }),
      card, restStartedAt: undefined, restEndsAt: undefined,
    },
  };
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

// Pure bulk edit: preserve completed work and the inputs restored after a skip.
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
  // Editing a skipped set must also update the saved input restored by Back.
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

export function advanceWorkout(state: AppState, skip = false): AppState {
  const progress = state.workout;
  if (!progress) return state;
  const card = currentCard(state, progress.sessionId);
  const set = state.sets.find((s) => s.id === card?.setId);
  if (!set || !card || cardCompleted(state, card)) return state;
  const side = card.side ?? 'normal';
  const skippedInputs = { ...set.skippedInputs };
  if (skip) skippedInputs[side] = {
    weightKg: set[`${side}WeightKg`], reps: set[`${side}Reps`],
  };
  else delete skippedInputs[side];
  const changes: Partial<WorkoutSet> = {
    skippedInputs,
    ...(card.side ? { [`${side}Completed`]: !skip } : { isCompleted: !skip }),
    ...(skip ? { [`${side}WeightKg`]: undefined, [`${side}Reps`]: undefined } : {}),
  };
  if (card.side) {
    const other = card.side === 'left' ? 'right' : 'left';
    changes.isCompleted = !!(set[`${other}Completed`] || skippedInputs[other]) &&
      (!skip || set[`${other}Completed`]);
  }
  const changed = updateSet(state, set.id, changes);
  const next = workoutCards(changed, progress.sessionId).find(
    (item) => changed.sets.find((row) => row.id === item.setId)?.exerciseId === set.exerciseId &&
      !cardCompleted(changed, item),
  );
  // Completing a set never changes exercises. Keep the last card until a swipe.
  const sideSwitch = next?.setId === set.id;
  const seconds =
    !skip &&
    !state.restTimerDisabled &&
    !!next &&
    (!sideSwitch || state.sideSwitchRestExerciseIds.includes(set.exerciseId))
      ? (state.exerciseRestDurations[set.exerciseId] ??
        state.restDurationSeconds)
      : 0;
  const started = Date.now();
  return {
    ...changed,
    sets: changed.sets.map((row) => row.id === set.id
      ? { ...row, finalSkippedSide: skip && !next && !nextExerciseCard(changed, card) ? side : undefined } : row),
    workout: {
      ...progress,
      card: next ?? card,
      history: [...progress.history, { card, set: { ...set } }],
      restStartedAt: seconds > 0 ? started : undefined,
      restEndsAt: seconds > 0 ? started + seconds * 1000 : undefined,
    },
  };
}

// Resolve the same destination for the live deck and the committed transition.
export function nextExerciseCard(state: AppState, from: WorkoutCard) {
  const sessionId = state.workout?.sessionId;
  const set = state.sets.find(row => row.id === from.setId && row.sessionId === sessionId);
  if (!set || sessionId === undefined) return undefined;
  const cards = workoutCards(state, sessionId);
  const order = [...new Set(cards.map(card => state.sets.find(row => row.id === card.setId)!.exerciseId))];
  const later = new Set(order.slice(order.indexOf(set.exerciseId) + 1));
  return cards.find(card => later.has(state.sets.find(row => row.id === card.setId)!.exerciseId) && !cardCompleted(state, card));
}

export function skipToNextExercise(state: AppState, from = state.workout && currentCard(state, state.workout.sessionId)): AppState {
  const sessionId = state.workout?.sessionId;
  const set = state.sets.find(row => row.id === from?.setId && row.sessionId === sessionId);
  if (!state.workout || !from || !set) return state;
  const next = nextExerciseCard(state, from);
  const remaining = workoutCards(state, state.workout.sessionId).filter(card =>
    state.sets.find(row => row.id === card.setId)?.exerciseId === set.exerciseId && !cardCompleted(state, card));
  let changed = state;
  for (const card of remaining) {
    changed = advanceWorkout({ ...changed, workout: { ...changed.workout!, card } }, true);
  }
  if (!next) return changed.workout ? finishWorkout(changed, set.sessionId) : changed;
  return { ...changed, workout: { ...changed.workout!, card: next, restStartedAt: undefined, restEndsAt: undefined } };
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
