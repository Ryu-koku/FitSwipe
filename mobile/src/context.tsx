import React, { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { loadState, saveState } from './storage';
import { AppState } from './types';
import { now, seedState } from './logic';

type AppContextValue = {
  state: AppState;
  ready: boolean;
  update: (updater: (state: AppState) => AppState) => void;
  startWorkout: (presetId?: string) => number;
  finishWorkout: (sessionId: number) => void;
};

const Context = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AppState>(seedState());
  const [ready, setReady] = useState(false);
  useEffect(() => { loadState().then((loaded) => { setState(loaded); setReady(true); }); }, []);
  useEffect(() => { if (ready) void saveState(state); }, [state, ready]);
  const value = useMemo<AppContextValue>(() => ({
    state,
    ready,
    update: (updater) => setState((current) => updater(current)),
    startWorkout: (presetId) => {
      let id = 0;
      setState((current) => {
        const existing = current.sessions.find((session) => session.status === 'IN_PROGRESS');
        if (existing) { id = existing.id; return current; }
        id = current.nextId;
        const preset = current.presets.find((item) => item.id === (presetId ?? current.selectedPresetId)) ?? current.presets[0];
        const session = { id, startedAt: now(), status: 'IN_PROGRESS' as const, presetId: preset?.id };
        const newSets = (preset?.exercises ?? []).flatMap((config) => Array.from({ length: Math.max(1, config.sets) }, (_, index) => ({
          id: id + index + 1 + (config.exerciseId * 1000), sessionId: id, exerciseId: config.exerciseId, setOrder: index + 1,
          normalWeightKg: config.weightKg, normalReps: config.reps, leftWeightKg: config.leftWeightKg, leftReps: config.reps, rightWeightKg: config.rightWeightKg, rightReps: config.reps,
          leftCompleted: false, rightCompleted: false, isCompleted: false,
        })));
        return { ...current, nextId: id + 1, sessions: [...current.sessions, session], sets: [...current.sets, ...newSets] };
      });
      return id;
    },
    finishWorkout: (sessionId) => setState((current) => ({
      ...current,
      sessions: current.sessions.map((session) => session.id === sessionId ? { ...session, status: 'COMPLETED', endedAt: now() } : session),
      sets: current.sets.map((set) => set.sessionId === sessionId ? { ...set, isCompleted: true, leftCompleted: true, rightCompleted: true } : set),
    })),
  }), [state, ready]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error('AppProvider is missing');
  return value;
}
