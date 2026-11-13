import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { AppState, Exercise, PresetExerciseConfig } from '../types';
import { formatWeight } from '../logic';
import { feedback, Card, useTheme } from '../ui';
import { AppIcon } from './AppIcon';
import { ExercisePictogram } from './ExercisePictogram';

export const PrepareExerciseCard = React.memo(function PrepareExerciseCard({ exercise, config, weightUnit, animate, onEdit }: {
  exercise: Exercise;
  config: PresetExerciseConfig;
  weightUnit: AppState['weightUnit'];
  animate: boolean;
  onEdit: (exerciseId: number) => void;
}) {
  const { colors, styles } = useTheme();
  return <Card style={{ padding: 16 }}>
    <View style={[styles.row, { gap: 12 }]}>
      <ExercisePictogram name={exercise.name} preview animate={animate} />
      <Pressable accessibilityRole="button" accessibilityLabel={`${exercise.name}を編集`}
        onPress={() => { feedback(); return onEdit(exercise.id); }} style={({ pressed }) => [{ flex: 1, minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 8 }, pressed && styles.pressed]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.body, { fontWeight: '700', fontSize: 17 }]}>{exercise.name}</Text>
        <Text style={[styles.small, { marginTop: 4 }]}>
          {exercise.mode === 'BILATERAL'
            ? `左 ${formatWeight(config.leftWeightKg, weightUnit)} / 右 ${formatWeight(config.rightWeightKg, weightUnit)}`
            : formatWeight(config.weightKg, weightUnit)} × {config.reps ?? '—'}回 · {config.sets}セット
        </Text>
      </View>
      <AppIcon name="next" color={colors.muted} size={18} />
      </Pressable>
    </View>
  </Card>;
});
