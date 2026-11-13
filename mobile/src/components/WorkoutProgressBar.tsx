import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../ui';

export function WorkoutProgressBar({ segments, currentId }: {
  segments: { id: number; name: string }[];
  currentId: number | undefined;
}) {
  const { colors } = useTheme();
  const currentIndex = segments.findIndex(segment => segment.id === currentId);
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 }}>
    {segments.map((segment, index) => {
      const selected = index === currentIndex;
      const filled = index < currentIndex;
      return <View key={segment.id} accessibilityRole="progressbar"
        accessibilityLabel={`${segment.name}の進捗`}
        accessibilityValue={{ min: 0, max: 1, now: filled ? 1 : 0 }}
        accessibilityState={selected ? { selected: true } : undefined}
        style={{ flex: 1, height: selected ? 11 : 7, borderRadius: 4,
          borderWidth: selected ? 2 : 0, borderColor: colors.primary,
          backgroundColor: selected ? colors.soft : filled ? colors.primary : colors.line }} />;
    })}
  </View>;
}
