import React, { useEffect, useRef, useState } from 'react';
import { AppState as NativeAppState, Text, View } from 'react-native';
import { Button, Card, useTheme } from '../ui';
import { useReducedMotion } from '../use-reduced-motion';
import { restRemaining } from '../rest-progress';
import { SwipeCard } from './SwipeCard';
import { RestMuscle } from './RestMuscle';

export function RestCard({
  endsAt,
  startedAt,
  exerciseName,
  next,
  onSkip,
}: {
  endsAt: number;
  startedAt?: number;
  exerciseName: string;
  next: string;
  onSkip: () => void;
}) {
  const { colors, styles, isDark } = useTheme();
  const [clock, setClock] = useState(() => Date.now());
  const [fallbackStart] = useState(() => Date.now());
  const reducedMotion = useReducedMotion();
  const latestSkip = useRef(onSkip);
  useEffect(() => {
    latestSkip.current = onSkip;
  }, [onSkip]);
  useEffect(() => {
    const refresh = () => setClock(Date.now());
    const timer = setInterval(refresh, reducedMotion ? 250 : 50);
    const subscription = NativeAppState.addEventListener('change', refresh);
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [reducedMotion]);
  useEffect(() => {
    if (clock >= endsAt + 3000) latestSkip.current();
  }, [clock, endsAt]);
  const { seconds: remaining, fraction } = restRemaining(startedAt ?? fallbackStart, endsAt, clock);
  const accent = isDark ? '#f0a58b' : '#ba5038';
  return (
    <SwipeCard rest onAdvance={onSkip} onSkip={onSkip}>
      <Card style={{ flex: 1, marginBottom: 0, padding: 16,
        backgroundColor: isDark ? '#202a2b' : '#fcf8f2', borderColor: colors.line }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.body, { color: accent, fontWeight: '800' }]}>{remaining ? '休憩' : '休憩終了'}</Text>
          <Text accessibilityLabel={remaining ? `次のセットまで残り${remaining}秒` : '休憩終了'}
            style={[styles.metric, { fontSize: 56, lineHeight: 64, fontVariant: ['tabular-nums'], marginTop: 4 }]}>
            {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
          </Text>
          <Text style={styles.small}>{remaining ? '次のセットまで' : 'まもなく次のセットへ'}</Text>
        </View>
        <View style={{ flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center', marginVertical: 8 }}>
          <RestMuscle animate={remaining > 0} />
        </View>
        <View accessibilityRole="progressbar" accessibilityLabel="休憩の残り時間"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(fraction * 100) }}
          style={{ height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: colors.line, marginBottom: 16 }}>
          <View style={{ width: `${fraction * 100}%`, height: '100%', borderRadius: 2, backgroundColor: accent }} />
        </View>
        <View style={{ padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface }}>
          <Text style={styles.small}>NEXT SET</Text>
          <Text style={[styles.body, { fontWeight: '800', marginTop: 3 }]}>{exerciseName}</Text>
          <Text style={styles.small}>{next}</Text>
        </View>
        <Button label="休憩をスキップ" onPress={onSkip} />
      </Card>
    </SwipeCard>
  );
}
