import { completedSessions, setVolume } from './logic';
import { AppState } from './types';

export function sessionVolumes(state: AppState, sessionId: number) {
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session) return [];
  const current = state.sets.filter((set) => set.sessionId === sessionId && set.isCompleted);
  return [...new Set(current.map((set) => set.exerciseId))].flatMap((exerciseId) => {
    const exercise = state.exercises.find((item) => item.id === exerciseId);
    const total = (id: number) => state.sets
      .filter((set) => set.sessionId === id && set.exerciseId === exerciseId && set.isCompleted)
      .reduce((sum, set) => sum + setVolume(set, exercise?.mode), 0);
    const today = total(sessionId);
    if (today <= 0) return [];
    const previousSession = completedSessions(state)
      .filter((item) => item.id !== sessionId && item.startedAt < session.startedAt &&
        state.sets.some((set) => set.sessionId === item.id && set.exerciseId === exerciseId && set.isCompleted))
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
    const previous = previousSession ? total(previousSession.id) : null;
    return [{ exerciseId, name: exercise?.name ?? '種目', today, previous,
      percent: previous !== null && previous > 0 ? (today - previous) / previous * 100 : null }];
  });
}
