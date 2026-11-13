import type { AppState } from './types';
import { exerciseGroup, muscleGroups } from './exercise-groups';
import { completedSessions, completedSets, localDay } from './logic';

export function recentMuscleSets(state: Pick<AppState, 'exercises' | 'sessions' | 'sets'>, today = new Date()) {
  const end = localDay(today);
  const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6, 12);
  const start = localDay(startDate);
  const sessionIds = new Set(completedSessions(state)
    .filter(session => { const day = localDay(session.startedAt); return day >= start && day <= end; })
    .map(session => session.id));
  const exercises = new Map(state.exercises.map(exercise => [exercise.id, exercise]));
  const counts = new Map(muscleGroups.map(group => [group, 0]));
  for (const set of completedSets(state)) {
    if (!sessionIds.has(set.sessionId)) continue;
    const exercise = exercises.get(set.exerciseId);
    if (!exercise) continue;
    const group = exerciseGroup(exercise);
    const key = counts.has(group) ? group : 'その他';
    counts.set(key, counts.get(key)! + 1);
  }
  return muscleGroups.map(group => ({ group, sets: counts.get(group)! }));
}
