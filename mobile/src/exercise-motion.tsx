import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, useWindowDimensions, View } from 'react-native';
import { useIsFocused } from 'expo-router';
import { useMotionPreference } from './use-reduced-motion';
import { createExerciseMotionQueue } from './exercise-motion-queue';
import { visibleIllustration } from './exercise-visuals';

type MotionContext = {
  focused: boolean;
  appState: string | null;
  reducedMotion: boolean | undefined;
  covered: boolean;
  refresh: () => void;
  subscribe: (check: () => void) => () => void;
  enqueue: (start: () => void) => () => void;
  overlay: (id: string, visible: boolean) => void;
};
const Motion = createContext<MotionContext | undefined>(undefined);

/** One scroll listener per screen, rather than timers on every image. */
export function ExerciseMotionViewport({ children }: React.PropsWithChildren) {
  const [queue] = useState(() => createExerciseMotionQueue());
  const focused = useIsFocused();
  const reducedMotion = useMotionPreference();
  const [appState, setAppState] = useState<string | null>(AppState.currentState ?? null);
  const [covered, setCovered] = useState(false);
  const checks = useRef(new Set<() => void>());
  const overlays = useRef(new Set<string>());
  const scheduled = useRef<number | undefined>(undefined);
  const refresh = useCallback(() => {
    if (scheduled.current !== undefined || !checks.current.size) return;
    scheduled.current = requestAnimationFrame(() => {
      scheduled.current = undefined;
      checks.current.forEach((check) => check());
    });
  }, []);
  const subscribe = useCallback((check: () => void) => {
    checks.current.add(check);
    check();
    return () => { checks.current.delete(check); };
  }, []);
  const overlay = useCallback((id: string, visible: boolean) => {
    if (overlays.current.has(id) === visible) return;
    if (visible) overlays.current.add(id);
    else overlays.current.delete(id);
    setCovered(overlays.current.size > 0);
  }, []);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    refresh();
  }, [focused, appState, refresh]);
  useEffect(() => () => {
    if (scheduled.current !== undefined) cancelAnimationFrame(scheduled.current);
    queue.clear();
  }, [queue]);
  const value = useMemo(() => ({ focused, appState, reducedMotion, covered, refresh, subscribe, overlay, enqueue: queue.enqueue }),
    [focused, appState, reducedMotion, covered, refresh, subscribe, overlay, queue]);
  return <Motion.Provider value={value}>{children}</Motion.Provider>;
}

export const useExerciseMotion = () => useContext(Motion);
export function useRefreshExerciseVisibility() {
  return useContext(Motion)?.refresh;
}

export function useExerciseVisibility(ref: React.RefObject<React.ElementRef<typeof View> | null>) {
  const context = useContext(Motion);
  const subscribe = context?.subscribe;
  const { width, height } = useWindowDimensions();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let mounted = true;
    const check = () => ref.current?.measureInWindow((x, y, measuredWidth, measuredHeight) => {
      if (mounted) setVisible(visibleIllustration({ x, y, width: measuredWidth, height: measuredHeight }, { width, height }));
    });
    const unsubscribe = subscribe?.(check);
    if (!subscribe) check();
    return () => { mounted = false; unsubscribe?.(); };
  }, [ref, subscribe, width, height]);
  return visible;
}
