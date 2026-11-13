import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { router, usePathname } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useApp } from './context';
import { Button, useTheme } from './ui';
import { initialTourStep, tourReducer, tourSteps, type TourEvent, type TourStep, type TourTargetId } from './tour-steps';

type Rect = { x: number; y: number; width: number; height: number };
type Target = { path: string; measure: (done: (rect: Rect | null) => void) => void };
const TourContext = createContext<{
  start: () => void; notify: (event: TourEvent) => void; active: boolean; step: TourStep;
  register: (id: TourTargetId, target: Target) => () => void;
}>({ start: () => {}, notify: () => {}, active: false, step: null, register: () => () => {} });

export const useTour = () => useContext(TourContext);

export function useTourTarget(id: TourTargetId) {
  const ref = useRef<React.ComponentRef<typeof View>>(null);
  const path = usePathname();
  const { register } = useTour();
  const [revision, setRevision] = useState(0);
  const onLayout = useCallback(() => setRevision(n => n + 1), []);
  useEffect(() => register(id, { path, measure: done => {
    if (!ref.current) { done(null); return; }
    ref.current.measureInWindow((x, y, width, height) => done(width > 0 && height > 0 ? { x, y, width, height } : null));
  } }), [id, path, register, revision]);
  return { ref, onLayout, collapsable: false as const };
}

export function TourProvider({ children }: React.PropsWithChildren) {
  const { state, ready } = useApp();
  const available = ready && !!(state.cloud || state.loginPromptDismissed);
  const path = usePathname();
  const [step, setStep] = useState<TourStep>(null);
  const [resume, setResume] = useState(false);
  const targets = useRef(new Map<TourTargetId, Target>());
  const register = useCallback((id: TourTargetId, target: Target) => {
    targets.current.set(id, target);
    return () => { if (targets.current.get(id) === target) targets.current.delete(id); };
  }, []);
  const start = useCallback(() => {
    const ongoing = state.sessions.some(s => s.status === 'IN_PROGRESS');
    setStep(initialTourStep(ongoing));
    setResume(ongoing);
  }, [state.sessions]);
  const notify = useCallback((event: TourEvent) => setStep(s => tourReducer(s, event)), []);
  useEffect(() => {
    if (available && resume && step !== null) {
      router.replace('/workout');
      // Consume the pending navigation only once the onboarding gate opens.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResume(false);
    }
  }, [available, resume, step]);
  useEffect(() => {
    // Synchronize the tour with Expo Router navigation, including native back.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (path === '/prepare') notify('prepare');
    if (path === '/workout') notify('workout');
  }, [path, notify]);
  const value = useMemo(() => ({ start, notify, active: step !== null, step, register }), [start, notify, step, register]);
  return <TourContext.Provider value={value}>
    {children}
    {step !== null && <TourOverlay key={`${step}:${path}`} step={step} path={path} available={available}
      findTarget={id => targets.current.get(id)} onExit={() => notify('exit')} onFinish={() => notify('finish')} />}
  </TourContext.Provider>;
}

function TourOverlay({ step, path, available, findTarget, onExit, onFinish }: {
  step: Exclude<TourStep, null>; path: string; available: boolean;
  findTarget: (id: TourTargetId) => Target | undefined; onExit: () => void; onFinish: () => void;
}) {
  const root = useRef<React.ComponentRef<typeof View>>(null);
  const { width, height } = useWindowDimensions();
  const { colors, styles } = useTheme();
  const [bounds, setBounds] = useState<Rect | null>(null);
  const [hole, setHole] = useState<Rect | null>(null);
  const [bubbleHeight, setBubbleHeight] = useState(120);
  const definition = step === 8 ? null : tourSteps[step];
  useEffect(() => {
    let alive = true;
    const measure = () => {
      root.current?.measureInWindow((x, y, w, h) => {
        if (!alive) return;
        setBounds(old => old?.x === x && old.y === y && old.width === w && old.height === h ? old : { x, y, width: w, height: h });
        const target = definition && available && path === definition.path ? findTarget(definition.target) : undefined;
        if (!target || target.path !== path) { setHole(null); return; }
        target.measure(rect => {
          if (!alive) return;
          const left = rect ? Math.max(0, rect.x - x) : 0;
          const top = rect ? Math.max(0, rect.y - y) : 0;
          const right = rect ? Math.min(w, rect.x - x + rect.width) : 0;
          const bottom = rect ? Math.min(h, rect.y - y + rect.height) : 0;
          const next = right > left && bottom > top ? { x: left, y: top, width: right - left, height: bottom - top } : null;
          setHole(old => JSON.stringify(old) === JSON.stringify(next) ? old : next);
        });
      });
    };
    measure();
    // Also follows native navigation animations, scrolling and rest/card replacement.
    const timer = setInterval(measure, 120);
    return () => { alive = false; clearInterval(timer); };
  }, [definition, available, path, findTarget, width, height]);
  const w = bounds?.width ?? width, h = bounds?.height ?? height;
  const above = hole?.y ?? 0, below = hole ? h - hole.y - hole.height : 0;
  const useAbove = above >= below;
  const space = hole ? (useAbove ? above : below) : h;
  // Large cards can leave very little space. Keep the card's swipe surface free
  // and allow the compact instruction to scroll in the surrounding space.
  const maxHeight = hole ? Math.max(48, space - 8) : Math.min(h, 200);
  const top = hole ? useAbove ? Math.max(0, hole.y - Math.min(bubbleHeight, maxHeight) - 4) : hole.y + hole.height + 4 : step === 8 ? Math.max(0, (h - bubbleHeight) / 2) : 4;
  const shade = { position: 'absolute' as const, backgroundColor: 'rgba(0,0,0,0.6)' };
  return <View ref={root} collapsable={false} pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 1000 }]}>
    {hole && <>
      <View style={[shade, { left: 0, top: 0, width: w, height: hole.y }]} />
      <View style={[shade, { left: 0, top: hole.y + hole.height, width: w, bottom: 0 }]} />
      <View style={[shade, { left: 0, top: hole.y, width: hole.x, height: hole.height }]} />
      <View style={[shade, { left: hole.x + hole.width, right: 0, top: hole.y, height: hole.height }]} />
      <View pointerEvents="none" style={{ position: 'absolute', left: hole.x, top: hole.y, width: hole.width, height: hole.height, borderRadius: 16, borderWidth: 2, borderColor: colors.primary }} />
    </>}
    <View accessibilityLiveRegion="polite" onLayout={event => setBubbleHeight(event.nativeEvent.layout.height)}
      style={{ position: 'absolute', left: 12, right: 12, top, maxHeight, borderRadius: 12, backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1, padding: 8 }}>
      <ScrollView>
        <Text style={styles.body}>{step === 8 ? 'これで基本操作は完了です' : hole ? definition?.text : '操作対象の表示を待っています'}</Text>
        {step === 8 && <Button label="はじめる" onPress={onFinish} />}
        <Button label="ツアーを終了" secondary onPress={onExit} />
      </ScrollView>
    </View>
  </View>;
}
