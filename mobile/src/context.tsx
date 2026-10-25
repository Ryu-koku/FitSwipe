import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { loadState, saveState } from './storage';
import { AppState } from './types';
import { seedState } from './logic';
import { finishWorkout, startWorkout } from './workout';

type AppContextValue = {
  state: AppState;
  ready: boolean;
  update: (updater: (state: AppState) => AppState) => void;
  startWorkout: (presetId?: string) => void;
  finishWorkout: (sessionId: number) => void;
  getState: () => AppState;
  persist: (updater: (state: AppState) => AppState) => Promise<void>;
  error?: string;
};

const Context = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AppState>(seedState);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string>();
  const current = useRef(state);
  useEffect(() => {
    loadState()
      .then((loaded) => {
        current.current = loaded;
        setState(loaded);
        setReady(true);
      })
      .catch(() =>
        setError('記録を読み込めませんでした。アプリを開き直してください。'),
      );
  }, []);
  const getState = useCallback(() => current.current, []);
  const persist = useCallback((updater: (state: AppState) => AppState) => {
    const next = updater(current.current);
    current.current = next;
    setState(next);
    return saveState(next);
  }, []);
  const update = useCallback(
    (updater: (state: AppState) => AppState) => {
      void persist(updater).catch(() =>
        setError(
          '記録を保存できませんでした。端末の空き容量を確認してください。',
        ),
      );
    },
    [persist],
  );
  const value: AppContextValue = {
    state,
    ready,
    update,
    startWorkout: (presetId) =>
      update((current) => startWorkout(current, presetId)),
    finishWorkout: (sessionId) =>
      update((current) => finishWorkout(current, sessionId)),
    getState,
    persist,
    error,
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error('AppProvider is missing');
  return value;
}
