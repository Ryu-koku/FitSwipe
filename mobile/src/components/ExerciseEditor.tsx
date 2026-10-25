import React, { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { useApp } from '../context';
import type { Exercise, ExerciseMode } from '../types';
import { numeric, nextId } from '../workout';
import { Button, Chip, Field, Sheet, useTheme } from '../ui';

export function ExerciseEditor({
  exercise,
  onClose,
  onAdded,
}: {
  exercise?: Exercise;
  onClose: () => void;
  onAdded?: (id: number) => void;
}) {
  const { state, update } = useApp();
  const { styles } = useTheme();
  const [name, setName] = useState(exercise?.name ?? '');
  const [mode, setMode] = useState<ExerciseMode>(exercise?.mode ?? 'NORMAL');
  const [weight, setWeight] = useState(
    String(
      exercise
        ? (state.exerciseWeightSteps[exercise.id] ?? state.weightStepKg)
        : state.weightStepKg,
    ),
  );
  const [rest, setRest] = useState(
    exercise && state.exerciseRestDurations[exercise.id] !== undefined
      ? String(state.exerciseRestDurations[exercise.id] / 60)
      : '',
  );
  const [left, setLeft] = useState(
    exercise ? state.leftFirstExerciseIds.includes(exercise.id) : false,
  );
  const [sideRest, setSideRest] = useState(
    exercise ? state.sideSwitchRestExerciseIds.includes(exercise.id) : false,
  );
  const weightValue = numeric(weight);
  const restValue = numeric(rest);
  const valid =
    !!name.trim() &&
    weightValue !== undefined &&
    weightValue >= 0.01 &&
    weightValue <= 1000 &&
    (!rest.trim() || (restValue !== undefined && restValue <= 120));
  const save = () => {
    const id = exercise?.id ?? nextId(state);
    update((s) => ({
      ...s,
      nextId: Math.max(s.nextId, id + 1),
      exercises: exercise
        ? s.exercises.map((e) =>
            e.id === id ? { ...e, name: name.trim() } : e,
          )
        : [
            ...s.exercises,
            {
              id,
              name: name.trim(),
              mode,
              sortOrder: s.exercises.length,
              archived: false,
            },
          ],
      exerciseWeightSteps: exercise
        ? { ...s.exerciseWeightSteps, [id]: weightValue! }
        : s.exerciseWeightSteps,
      exerciseRestDurations: Object.fromEntries([
        ...Object.entries(s.exerciseRestDurations).filter(
          ([key]) => key !== String(id),
        ),
        ...(rest.trim() ? [[String(id), Math.round(restValue! * 60)]] : []),
      ]),
      leftFirstExerciseIds: [
        ...s.leftFirstExerciseIds.filter((value) => value !== id),
        ...(left ? [id] : []),
      ],
      sideSwitchRestExerciseIds: [
        ...s.sideSwitchRestExerciseIds.filter((value) => value !== id),
        ...(sideRest ? [id] : []),
      ],
    }));
    onAdded?.(id);
    onClose();
  };
  return (
    <Sheet title={exercise ? '種目を編集' : '種目を追加'} onClose={onClose}>
      <Field
        label="種目名"
        value={name}
        onChangeText={setName}
        maxLength={exercise ? 32 : undefined}
      />
      {!exercise && (
        <View style={[styles.wrap, { marginTop: 12 }]}>
          <Chip
            label="通常"
            active={mode === 'NORMAL'}
            onPress={() => setMode('NORMAL')}
          />
          <Chip
            label="左右別"
            active={mode === 'BILATERAL'}
            onPress={() => setMode('BILATERAL')}
          />
        </View>
      )}
      {exercise && (
        <>
          <Field
            label="重量の刻み幅（kg）"
            keyboardType="decimal-pad"
            value={weight}
            onChangeText={setWeight}
          />
          <Field
            label="セット間休憩（分・空欄で共通設定）"
            keyboardType="decimal-pad"
            value={rest}
            onChangeText={setRest}
          />
          {mode === 'BILATERAL' && (
            <>
              <View style={styles.row}>
                <Text style={styles.body}>左から開始</Text>
                <Switch value={left} onValueChange={setLeft} />
              </View>
              <View style={styles.row}>
                <Text style={styles.body}>左右切り替え時にも休憩</Text>
                <Switch value={sideRest} onValueChange={setSideRest} />
              </View>
            </>
          )}
          <Button
            label="共通設定に戻す"
            secondary
            onPress={() => {
              setWeight(String(state.weightStepKg));
              setRest('');
              setLeft(false);
              setSideRest(false);
              update((s) => ({
                ...s,
                exerciseWeightSteps: Object.fromEntries(
                  Object.entries(s.exerciseWeightSteps).filter(
                    ([key]) => key !== String(exercise.id),
                  ),
                ),
                exerciseRestDurations: Object.fromEntries(
                  Object.entries(s.exerciseRestDurations).filter(
                    ([key]) => key !== String(exercise.id),
                  ),
                ),
                leftFirstExerciseIds: s.leftFirstExerciseIds.filter(
                  (id) => id !== exercise.id,
                ),
                sideSwitchRestExerciseIds: s.sideSwitchRestExerciseIds.filter(
                  (id) => id !== exercise.id,
                ),
              }));
            }}
          />
        </>
      )}
      <Button
        label={exercise ? '保存' : '追加'}
        disabled={!valid}
        onPress={save}
      />
    </Sheet>
  );
}
