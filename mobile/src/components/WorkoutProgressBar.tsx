import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../ui';

export function WorkoutProgressBar({ segments }: {
  segments: { id: number; name: string; completed: number; total: number }[];
}) {
  const { colors } = useTheme();
  return <View style={{ flexDirection: 'row', gap: 4, marginBottom: 16 }}>
    {segments.map((segment) => {
      const value = segment.total ? Math.max(0, Math.min(1, segment.completed / segment.total)) : 0;
      return <View key={segment.id} accessibilityRole="progressbar"
        accessibilityLabel={`${segment.name}の進捗`}
        accessibilityValue={{ min: 0, max: segment.total, now: segment.completed }}
        style={{ flex: 1, height: 7, borderRadius: 4, overflow: 'hidden', backgroundColor: colors.line }}>
        <View style={{ height: '100%', borderRadius: 4, backgroundColor: colors.primary, width: `${value * 100}%` }} />
      </View>;
    })}
  </View>;
}
