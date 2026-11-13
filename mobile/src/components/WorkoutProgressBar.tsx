import React from 'react';
import { Pressable, View } from 'react-native';
import { feedback, useTheme } from '../ui';

export function WorkoutProgressBar({ segments, currentId, onSelect }: {
  segments: { id: number; name: string }[];
  currentId: number | undefined;
  onSelect: (exerciseId: number) => void;
}) {
  const { colors } = useTheme();
  const currentIndex = segments.findIndex(segment => segment.id === currentId);
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: -12, marginBottom: 4, paddingVertical: 12 }}>
    {segments.map((segment, index) => {
      const selected = index === currentIndex;
      const filled = index < currentIndex;
      const style = { flex: 1, height: selected ? 11 : 7, borderRadius: 4,
          borderWidth: selected ? 2 : 0, borderColor: colors.primary,
          backgroundColor: selected ? colors.soft : filled ? colors.primary : colors.line };
      return filled ? <Pressable key={segment.id} accessibilityRole="button"
        accessibilityLabel={`${segment.name}に戻る`} hitSlop={{ top: 12, bottom: 12 }}
        onPress={() => { feedback(); onSelect(segment.id); }} style={style} />
        : <View key={segment.id} accessibilityRole="progressbar"
          accessibilityLabel={`${segment.name}の進捗`}
          accessibilityValue={{ min: 0, max: 1, now: 0 }}
          accessibilityState={selected ? { selected: true } : undefined} style={style} />;
    })}
  </View>;
}
