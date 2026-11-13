import type { AppState, Exercise } from './types';
import { exerciseKey } from './exercise-catalog';
import { presetExerciseDefaults, resizeSets } from './workout';

// Old imports or sync data can contain equal exercises with different IDs.
// Keep their records intact while offering each name/mode only once.
export function availableExerciseChoices(exercises: Exercise[], excludedIds: number[] = []): Exercise[] {
  const seen = new Set(exercises.filter((exercise) => excludedIds.includes(exercise.id)).map(exerciseKey));
  return exercises.filter((exercise) => !exercise.archived)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((exercise) => {
      const key = exerciseKey(exercise);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

// Recheck against current state at confirmation time so stale selections cannot
// duplicate exercises or shrink sets already added to the workout.
export function addWorkoutExercises(state: AppState, sessionId: number, ids: number[]): AppState {
  if (!state.sessions.some((session) => session.id === sessionId)) return state;
  const additions = [...new Set(ids)].filter((id) =>
    state.exercises.some((exercise) => exercise.id === id && !exercise.archived) &&
    !state.sets.some((set) => set.sessionId === sessionId && set.exerciseId === id),
  );
  const next = additions.reduce((s, id) => resizeSets(s, sessionId, id, 1), state);
  return {
    ...next,
    workout: next.workout?.sessionId === sessionId
      ? { ...next.workout, exerciseOrder: [...new Set([...next.workout.exerciseOrder, ...additions])] }
      : next.workout,
  };
}

export function addPresetExercises(state: AppState, presetId: string, ids: number[]): AppState {
  return {
    ...state,
    presets: state.presets.map((preset) => preset.id !== presetId ? preset : {
      ...preset,
      exercises: [...preset.exercises, ...[...new Set(ids)].flatMap((id) => {
        const exercise = state.exercises.find((item) => item.id === id && !item.archived);
        return exercise && !preset.exercises.some((config) => config.exerciseId === id)
          ? [presetExerciseDefaults(id)] : [];
      })],
    }),
  };
}
