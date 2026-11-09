import type { AppState, WorkoutSet } from './types';

type RecordedValues = Pick<WorkoutSet, 'normalWeightKg' | 'normalReps' | 'leftWeightKg' | 'leftReps' | 'rightWeightKg' | 'rightReps'>;

// Historical corrections must never carry weights into other sets or reopen work.
export function editRecordedSet(state: AppState, setId: number, values: RecordedValues): AppState {
  const row = state.sets.find((set) => set.id === setId);
  if (!row || !state.sessions.some((session) => session.id === row.sessionId && session.status === 'COMPLETED')) return state;
  if (Object.entries(values).some(([key, value]) => value !== undefined &&
    (!Number.isFinite(value) || value < 0 || (key.endsWith('Reps') && !Number.isInteger(value))))) return state;
  return { ...state, sets: state.sets.map((set) => set.id === setId ? { ...set, ...values } : set) };
}

export function deleteRecordedSet(state: AppState, setId: number): AppState {
  const row = state.sets.find((set) => set.id === setId);
  if (!row || !state.sessions.some((session) => session.id === row.sessionId && session.status === 'COMPLETED')) return state;
  return { ...state, sets: state.sets.filter((set) => set.id !== setId) };
}

export function deleteRecordedSession(state: AppState, sessionId: number): AppState {
  if (!state.sessions.some((session) => session.id === sessionId && session.status === 'COMPLETED')) return state;
  return { ...state, sessions: state.sessions.filter((session) => session.id !== sessionId),
    sets: state.sets.filter((set) => set.sessionId !== sessionId) };
}
