import { AppState, AchievementSummary, Exercise, ExerciseMode, WorkoutSet } from './types';

export const now = () => new Date().toISOString();

export const initialExercises: Exercise[] = [
  { id: 1, name: 'ベンチプレス', mode: 'NORMAL', sortOrder: 0, archived: false },
  { id: 2, name: 'ラットプルダウン', mode: 'NORMAL', sortOrder: 1, archived: false },
  { id: 3, name: 'レッグプレス', mode: 'NORMAL', sortOrder: 2, archived: false },
  { id: 4, name: 'スクワット', mode: 'NORMAL', sortOrder: 3, archived: false },
  { id: 5, name: '腕立て伏せ', mode: 'NORMAL', sortOrder: 4, archived: false },
  { id: 6, name: 'ダンベルカール（左右）', mode: 'BILATERAL', sortOrder: 5, archived: false },
];

const defaultConfig = (exerciseId: number, weightKg: number, mode: ExerciseMode = 'NORMAL') => ({
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
    exercises: initialExercises,
    sessions: [],
    sets: [],
    presets: [
      { id: 'gym', name: 'ジム', exercises: [defaultConfig(1, 50), defaultConfig(2, 45), defaultConfig(3, 100)] },
      { id: 'home', name: '家', exercises: [defaultConfig(4, 50), defaultConfig(5, 0)] },
    ],
    selectedPresetId: 'gym',
    themeMode: 'system',
    weekStartsMonday: false,
    weightStepKg: 1,
    restDurationSeconds: 90,
    visibleAchievementMetrics: ['days', 'sets', 'history', 'streak', 'volume', 'reps', 'bests', 'big3'],
    rooms: [],
  };
}

export const activeExercises = (state: AppState) => state.exercises.filter((e) => !e.archived).sort((a, b) => a.sortOrder - b.sortOrder);
export const selectedPreset = (state: AppState) => state.presets.find((p) => p.id === state.selectedPresetId) ?? state.presets[0];
export const completedSessions = (state: AppState) => state.sessions.filter((s) => s.status === 'COMPLETED');
export const completedSets = (state: AppState) => state.sets.filter((set) => set.isCompleted);

function localDay(value: string) {
  return new Date(value).toLocaleDateString('sv-SE');
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

export function achievementSummary(state: AppState): AchievementSummary {
  const finished = completedSets(state);
  const sessions = completedSessions(state);
  const days = new Set(sessions.map((s) => localDay(s.startedAt)));
  const weeks = new Set(sessions.map((s) => mondayKey(s.startedAt, state.weekStartsMonday)));
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
  const first = sessions.map((s) => new Date(s.startedAt).getTime()).sort((a, b) => a - b)[0];
  const totalReps = finished.reduce((sum, set) => {
    if (state.exercises.find((e) => e.id === set.exerciseId)?.mode === 'BILATERAL') return sum + (set.leftReps ?? 0) + (set.rightReps ?? 0);
    return sum + (set.normalReps ?? 0);
  }, 0);
  const volume = finished.reduce((sum, set) => {
    const exercise = state.exercises.find((e) => e.id === set.exerciseId);
    if (exercise?.mode === 'BILATERAL') return sum + (set.leftWeightKg ?? 0) * (set.leftReps ?? 0) + (set.rightWeightKg ?? 0) * (set.rightReps ?? 0);
    return sum + (set.normalWeightKg ?? 0) * (set.normalReps ?? 0);
  }, 0);
  const bestByKey = new Map<string, [number, number]>();
  let bestUpdates = 0;
  [...finished].sort((a, b) => (state.sessions.find((s) => s.id === a.sessionId)?.startedAt ?? '').localeCompare(state.sessions.find((s) => s.id === b.sessionId)?.startedAt ?? '')).forEach((set) => {
    const bilateral = state.exercises.find((e) => e.id === set.exerciseId)?.mode === 'BILATERAL';
    const sides = bilateral ? [1, 2] : [0];
    sides.forEach((side) => {
      const value = performance(set, side);
      const key = `${set.exerciseId}:${side}`;
      const previous = bestByKey.get(key);
      if (value[0] > 0 && value[1] > 0 && (!previous || value[0] > previous[0] || (value[0] === previous[0] && value[1] > previous[1]))) {
        if (previous) bestUpdates += 1;
        bestByKey.set(key, value);
      }
    });
  });
  const estimated = (name: string) => {
    const exercise = state.exercises.find((e) => e.name === name);
    if (!exercise) return 0;
    return Math.max(...finished.filter((set) => set.exerciseId === exercise.id).map((set) => {
      const [weight, reps] = performance(set);
      return weight > 0 && reps > 0 && reps <= 10 ? (reps === 1 ? weight : weight * (1 + reps / 30)) : 0;
    }), 0);
  };
  const bench = estimated('ベンチプレス');
  const squat = estimated('スクワット');
  const deadlift = estimated('デッドリフト');
  return {
    big3: bench > 0 && squat > 0 && deadlift > 0 ? bench + squat + deadlift : undefined,
    streakWeeks: streak,
    trainingDays: days.size,
    completedSets: finished.length,
    recordHistoryDays: first ? Math.max(0, Math.floor((Date.now() - first) / 86400000)) : 0,
    liftedWeightKg: volume,
    totalRepetitions: totalReps,
    personalBestUpdates: bestUpdates,
  };
}

export function formatWeight(value?: number) {
  if (value === undefined || Number.isNaN(value)) return '—';
  return Number.isInteger(value) ? `${value} kg` : `${value.toFixed(1)} kg`;
}

export function previousSet(state: AppState, exerciseId: number, sessionId: number) {
  const priorSessionIds = state.sessions.filter((s) => s.status === 'COMPLETED' && s.id !== sessionId).sort((a, b) => b.startedAt.localeCompare(a.startedAt)).map((s) => s.id);
  for (const id of priorSessionIds) {
    const found = state.sets.find((set) => set.sessionId === id && set.exerciseId === exerciseId && set.isCompleted);
    if (found) return found;
  }
  return undefined;
}
