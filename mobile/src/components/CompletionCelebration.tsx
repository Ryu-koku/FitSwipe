import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { feedback, useTheme } from '../ui';
import { useMotionPreference } from '../use-reduced-motion';

// Retained across route remounts; a completed session celebrates only once per app run.
const celebrated = new Set<number>();

export function CompletionCelebration({ sessionId, onDone }: { sessionId: number; onDone: () => void }) {
  const { colors, styles } = useTheme();
  const reduced = useMotionPreference();
  const [eligible] = useState(() => !celebrated.has(sessionId));
  const notified = useRef(false);
  const [clock] = useState(() => new Animated.Value(0));
  const finish = useRef(onDone);
  useEffect(() => { finish.current = onDone; }, [onDone]);
  useEffect(() => {
    if (reduced === undefined) return;
    if (!eligible) { finish.current(); return; }
    celebrated.add(sessionId);
    if (!notified.current) { notified.current = true; feedback(); }
    if (reduced) { finish.current(); return; }
    clock.setValue(0);
    const animation = Animated.timing(clock, { toValue: 1750, duration: 1750, easing: Easing.linear, useNativeDriver: true });
    animation.start(({ finished }) => { if (finished) finish.current(); });
    return () => animation.stop();
  }, [clock, eligible, reduced, sessionId]);
  if (!eligible || reduced === true) return null;
  // Cover the results while the asynchronous accessibility preference resolves.
  if (reduced === undefined) return <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg, zIndex: 100 }]} />;
  const interpolate = (inputRange: number[], outputRange: number[]) => clock.interpolate({ inputRange, outputRange, extrapolate: 'clamp' });
  return <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg, opacity: interpolate([1500, 1750], [1, 0]), zIndex: 100 }]}>
    <Pressable accessibilityRole="button" accessibilityLabel="完了演出をスキップ" onPress={() => { clock.stopAnimation(); finish.current(); }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
        {Array.from({ length: 14 }, (_, index) => {
          const angle = index * Math.PI * 2 / 14;
          const x = Math.cos(angle) * (85 + index % 3 * 22);
          const y = Math.sin(angle) * 90 - 35;
          return <Animated.View key={index} style={{ position: 'absolute', width: 5, height: 9, borderRadius: 1,
            backgroundColor: [colors.primary, '#45d9cc', '#ffd35a', '#ff984f'][index % 4],
            opacity: interpolate([0, 100, 650, 1000], [0, 1, 1, 0]),
            transform: [{ translateX: interpolate([0, 650, 1000], [0, x, x * 1.15]) },
              { translateY: interpolate([0, 500, 1000], [0, y, y + 100]) },
              { rotate: clock.interpolate({ inputRange: [0, 1000], outputRange: ['0deg', `${index % 2 ? 240 : -240}deg`], extrapolate: 'clamp' }) }],
          }} />;
        })}
        <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: 32, borderWidth: 2, borderColor: colors.primary,
          opacity: interpolate([0, 150, 700], [0, 0.6, 0]), transform: [{ scale: interpolate([0, 700], [1, 2.2]) }] }]} />
        <Animated.View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', transform: [{ scale: interpolate([0, 240, 380], [0.4, 1.12, 1]) }] }}>
          <Text style={{ fontSize: 36, color: colors.bg }}>✓</Text>
        </Animated.View>
      </View>
      <Animated.Text style={[styles.title, { marginTop: 24, opacity: interpolate([380, 650], [0, 1]), transform: [{ translateY: interpolate([380, 650], [12, 0]) }] }]}>おつかれさま！</Animated.Text>
    </Pressable>
  </Animated.View>;
}
