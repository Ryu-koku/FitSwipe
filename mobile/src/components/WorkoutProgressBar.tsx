import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../ui';

export function WorkoutProgressBar({ progress }: { progress: number }) {
  const { colors } = useTheme();
  const value = Math.max(0, Math.min(1, progress));
  return <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
    style={{ height: 5, borderRadius: 3, overflow: 'hidden', backgroundColor: colors.line, marginBottom: 16 }}>
    <View style={{ height: 5, borderRadius: 3, backgroundColor: colors.primary, width: `${value * 100}%` }} />
  </View>;
}
