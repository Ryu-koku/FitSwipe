import {
  AppState,
  AchievementSummary,
  Exercise,
  ExerciseMode,
  WorkoutSet,
} from './types';
import { exerciseGroup } from './exercise-groups';

export const now = () => new Date().toISOString();

export const initialExercises: Exercise[] = [
  {
    id: 1,
    name: 'ベンチプレス',
    mode: 'NORMAL',
    sortOrder: 0,
    archived: false,
  },
  {
    id: 2,
    name: 'ラットプルダウン',
    mode: 'NORMAL',
    sortOrder: 1,
    archived: false,
  },
  {
    id: 3,
    name: 'レッグプレス',
    mode: 'NORMAL',
    sortOrder: 2,
    archived: false,
  },
  { id: 4, name: 'スクワット', mode: 'NORMAL', sortOrder: 3, archived: false },
  { id: 5, name: '腕立て伏せ', mode: 'NORMAL', sortOrder: 4, archived: false },
  {
    id: 6,
    name: 'ダンベルカール（左右）',
    mode: 'BILATERAL',
    sortOrder: 5,
    archived: false,
  },
  { id: 7, name: 'プランク', mode: 'NORMAL', sortOrder: 6, archived: false },
];

const defaultConfig = (
  exerciseId: number,
  weightKg: number,
  mode: ExerciseMode = 'NORMAL',
) => ({
  exerciseId,
  weightKg,
  leftWeightKg: mode === 'BILATERAL' ? weightKg : undefined,
  rightWeightKg: mode === 'BILATERAL' ? weightKg : undefined,
  reps: 10,
  sets: 3,
});

export function seedState(): AppState {
  return {
    nextId: 100,
    exercises: initialExercises.map((exercise) => ({ ...exercise, muscleGroup: exerciseGroup(exercise) })),
    bodyMeasurements: [],
    sessions: [],
    sets: [],
    presets: [
      {
        id: 'gym',
        name: 'ジム',
        exercises: [
          defaultConfig(1, 55),
          defaultConfig(2, 50),
          defaultConfig(3, 105),
        ],
      },
      {
        id: 'home',
        name: '家',
        exercises: [
          defaultConfig(4, 72.5),
          defaultConfig(5, 0),
          defaultConfig(7, 0),
        ],
      },
    ],
    selectedPresetId: 'gym',
    themeMode: 'system',
    weekStartsMonday: false,
    weightStepKg: 1,
    restDurationSeconds: 90,
    visibleAchievementMetrics: [
      'days',
      'sets',
      'history',
      'streak',
      'volume',
      'reps',
      'bests',
      'big3',
    ],
    exerciseWeightSteps: { 1: 2.5, 2: 5, 3: 5, 4: 2.5, 5: 2.5, 7: 2.5 },
    exerciseRestDurations: {},
    restTimerDisabledExerciseIds: [],
    sideSwitchRestExerciseIds: [],
    leftFirstExerciseIds: [],
    installationId: `rn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
    pendingPosts: [],
    roomDetails: {},
    rooms: [],
  };
}

export const activeExercises = (state: AppState) =>
  state.exercises
    .filter((e) => !e.archived)
    .sort((a, b) => a.sortOrder - b.sortOrder);
export const selectedPreset = (state: AppState) =>
  state.presets.find((p) => p.id === state.selectedPresetId) ??
  state.presets[0];
export const completedSessions = (state: AppState) =>
  state.sessions.filter((s) => s.status === 'COMPLETED');
export const completedSets = (state: AppState) =>
  state.sets.filter((set) => set.isCompleted);

export function localDay(value: string | Date) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function recordHistoryLabel(first?: string, today = now()) {
  if (!first) return '—';
  const start = new Date(`${localDay(first)}T12:00:00`);
  const end = new Date(`${localDay(today)}T12:00:00`);
  const months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    end.getMonth() -
    start.getMonth() -
    (end.getDate() < start.getDate() ? 1 : 0);
  const years = Math.floor(months / 12);
  if (years > 0)
    return months % 12 ? `${years}年${months % 12}か月` : `${years}年`;
  if (months > 0) return `${months}か月`;
  return `${Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1)}日`;
}

function mondayKey(value: string, monday = true) {
  const date = new Date(value);
  const day = date.getDay();
  const offset = monday ? (day + 6) % 7 : day;
  date.setDate(date.getDate() - offset);
  return localDay(date.toISOString());
}

function performance(set: WorkoutSet, side = 0): [number, number] {
  if (side === 1) return [set.leftWeightKg ?? 0, set.leftReps ?? 0];
  if (side === 2) return [set.rightWeightKg ?? 0, set.rightReps ?? 0];
  return [set.normalWeightKg ?? 0, set.normalReps ?? 0];
}

export function trainingLevel(state: AppState) {
  const trainingDays = achievementSummary(state).trainingDays;
  return { trainingDays, level: trainingDays + 1 };
}

// Daily best estimated 1RM, not an all-time running maximum.
export function strengthGrowth(
  state: AppState,
  exerciseId: number,
  side = 0,
  today = new Date(),
) {
  const start = new Date(today);
  start.setDate(start.getDate() - 89);
  const firstDay = localDay(start);
  const lastDay = localDay(today);
  const sessions = new Map(
    completedSessions(state).map((session) => [session.id, localDay(session.startedAt)]),
  );
  const daily = new Map<string, number>();
  state.sets.forEach((set) => {
    const date = sessions.get(set.sessionId);
    if (!date || date < firstDay || date > lastDay ||
        !set.isCompleted || set.exerciseId !== exerciseId) return;
    const [weight, reps] = performance(set, side);
    if (!Number.isFinite(weight) || !Number.isFinite(reps) ||
        weight <= 0 || reps < 1 || reps > 10 || !Number.isInteger(reps)) return;
    const value = reps === 1 ? weight : weight * (1 + reps / 30);
    daily.set(date, Math.max(daily.get(date) ?? 0, value));
  });
  return [...daily].sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));
}

export function achievementSummary(state: AppState): AchievementSummary {
  const sessions = completedSessions(state);
  const finished = completedSets(state).filter((set) =>
    sessions.some(
      (s) => s.id === set.sessionId && localDay(s.startedAt) <= localDay(now()),
    ),
  );
  const recordedSessions = sessions.filter((s) =>
    finished.some((set) => set.sessionId === s.id),
  );
  const days = new Set(recordedSessions.map((s) => localDay(s.startedAt)));
  const weeks = new Set(
    recordedSessions.map((s) => mondayKey(s.startedAt, state.weekStartsMonday)),
  );
  const todayWeek = mondayKey(now(), state.weekStartsMonday);
  let cursor = todayWeek;
  if (!weeks.has(cursor)) {
    const d = new Date(`${cursor}T00:00:00`);
    d.setDate(d.getDate() - 7);
    cursor = localDay(d.toISOString());
  }
  let streak = 0;
  while (weeks.has(cursor)) {
    streak += 1;
    const d = new Date(`${cursor}T00:00:00`);
    d.setDate(d.getDate() - 7);
    cursor = localDay(d.toISOString());
  }
  const first = recordedSessions
    .map((s) => new Date(`${localDay(s.startedAt)}T00:00:00`).getTime())
    .sort((a, b) => a - b)[0];
  const totalReps = finished.reduce((sum, set) => {
    if (
      state.exercises.find((e) => e.id === set.exerciseId)?.mode === 'BILATERAL'
    )
      return sum + (set.leftReps ?? 0) + (set.rightReps ?? 0);
    return sum + (set.normalReps ?? 0);
  }, 0);
  const volume = finished.reduce((sum, set) => {
    const exercise = state.exercises.find((e) => e.id === set.exerciseId);
    if (exercise?.mode === 'BILATERAL')
      return (
        sum +
        (set.leftWeightKg ?? 0) * (set.leftReps ?? 0) +
        (set.rightWeightKg ?? 0) * (set.rightReps ?? 0)
      );
    return sum + (set.normalWeightKg ?? 0) * (set.normalReps ?? 0);
  }, 0);
  const bestByKey = new Map<string, [number, number]>();
  let bestUpdates = 0;
  const better = (a: [number, number], b?: [number, number]) =>
    !b || a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]);
  [...recordedSessions]
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt) || a.id - b.id)
    .forEach((session) => {
      const sessionBests = new Map<string, [number, number]>();
      finished
        .filter((set) => set.sessionId === session.id)
        .forEach((set) => {
          const bilateral =
            state.exercises.find((e) => e.id === set.exerciseId)?.mode ===
            'BILATERAL';
          (bilateral ? [1, 2] : [0]).forEach((side) => {
            const value = performance(set, side);
            const key = `${set.exerciseId}:${side}`;
            if (
              Number.isFinite(value[0]) &&
              value[0] >= 0 &&
              value[1] > 0 &&
              better(value, sessionBests.get(key))
            )
              sessionBests.set(key, value);
          });
        });
      sessionBests.forEach((value, key) => {
        if (better(value, bestByKey.get(key))) {
          if (bestByKey.has(key)) bestUpdates += 1;
          bestByKey.set(key, value);
        }
      });
    });
  const estimated = (names: string[]) => {
    const ids = state.exercises
      .filter(
        (e) =>
          e.mode === 'NORMAL' &&
          names.includes(
            e.name.normalize('NFKC').toLowerCase().replace(/\s/g, ''),
          ),
      )
      .map((e) => e.id);
    return Math.max(
      ...finished
        .filter((set) => ids.includes(set.exerciseId))
        .map((set) => {
          const [weight, reps] = performance(set);
          return weight > 0 && reps > 0 && reps <= 10
            ? reps === 1
              ? weight
              : weight * (1 + reps / 30)
            : 0;
        }),
      0,
    );
  };
  const bench = estimated([
    'ベンチプレス',
    'バーベルベンチプレス',
    'benchpress',
    'barbellbenchpress',
  ]);
  const squat = estimated([
    'スクワット',
    'バーベルスクワット',
    'バックスクワット',
    'squat',
    'barbellsquat',
    'backsquat',
  ]);
  const deadlift = estimated([
    'デッドリフト',
    'バーベルデッドリフト',
    'deadlift',
    'barbelldeadlift',
  ]);
  return {
    big3:
      bench > 0 && squat > 0 && deadlift > 0
        ? bench + squat + deadlift
        : undefined,
    streakWeeks: streak,
    trainingDays: days.size,
    completedSets: finished.length,
    recordHistoryDays: first
      ? Math.max(
          0,
          Math.round(
            (new Date(`${localDay(now())}T00:00:00`).getTime() - first) /
              86400000,
          ),
        )
      : 0,
    liftedWeightKg: volume,
    totalRepetitions: totalReps,
    personalBestUpdates: bestUpdates,
    big3Lifts: { bench, squat, deadlift },
    recordHistoryLabel: recordHistoryLabel(
      first === undefined ? undefined : new Date(first).toISOString(),
    ),
  };
}

export function formatWeight(value?: number) {
  if (value === undefined || Number.isNaN(value)) return '—';
  return `${Number(value.toFixed(2))} kg`;
}

export function estimatedOneRepMax(weightKg: number, reps: number) {
  if (!Number.isFinite(weightKg) || weightKg <= 0 || !Number.isInteger(reps) || reps < 1 || reps > 12) return undefined;
  return Math.round(weightKg * (1 + (reps - 1) / 30) * 10) / 10;
}

export function lastExerciseTrainingDays(state: AppState, exerciseId: number, today = new Date()) {
  const sessionIds = new Set(state.sets.filter(set => set.exerciseId === exerciseId && set.isCompleted).map(set => set.sessionId));
  const latest = completedSessions(state).filter(session => sessionIds.has(session.id)).map(session => session.startedAt).sort().at(-1);
  if (!latest) return undefined;
  const start = new Date(latest); start.setHours(0,0,0,0);
  const end = new Date(today); end.setHours(0,0,0,0);
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000));
}

export function previousSet(
  state: AppState,
  exerciseId: number,
  sessionId: number,
) {
  const priorSessionIds = state.sessions
    .filter((s) => s.status === 'COMPLETED' && s.id !== sessionId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .map((s) => s.id);
  for (const id of priorSessionIds) {
    const found = state.sets.find(
      (set) =>
        set.sessionId === id &&
        set.exerciseId === exerciseId &&
        set.isCompleted,
    );
    if (found) return found;
  }
  return undefined;
}
