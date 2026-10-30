import React, { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { useApp } from '../context';
import type { Exercise, ExerciseMode } from '../types';
import { numeric, nextId } from '../workout';
import { Button, Chip, Field, Sheet, useTheme } from '../ui';
import { exerciseGroup, muscleGroups } from '../exercise-groups';
import { BodyRegionPicker } from './BodyRegionPicker';

export function ExerciseEditor({
  exercise,
  onClose,
  onAdded,
  excludedIds = [],
}: {
  exercise?: Exercise;
  onClose: () => void;
  onAdded?: (id: number) => void;
  excludedIds?: number[];
}) {
  const { state, update } = useApp();
  const { styles } = useTheme();
  const [name, setName] = useState(exercise?.name ?? '');
  const [mode, setMode] = useState<ExerciseMode>(exercise?.mode ?? 'NORMAL');
  const [muscleGroup, setMuscleGroup] = useState(exercise ? exerciseGroup(exercise) : '');
  const [selectedGroup, setSelectedGroup] = useState<string>();
  const [creating, setCreating] = useState(false);
  const [showBody, setShowBody] = useState(false);
  const [weight, setWeight] = useState(
    String(
      exercise
        ? (state.exerciseWeightSteps[exercise.id] ?? state.weightStepKg)
        : state.weightStepKg,
    ),
  );
  const [left, setLeft] = useState(
    exercise ? state.leftFirstExerciseIds.includes(exercise.id) : false,
  );
  const [restTimerEnabled, setRestTimerEnabled] = useState(
    exercise ? !state.restTimerDisabledExerciseIds.includes(exercise.id) : true,
  );
  const weightValue = numeric(weight);
  const valid =
    !!name.trim() &&
    !!muscleGroup.trim() &&
    weightValue !== undefined &&
    weightValue >= 0.01 &&
    weightValue <= 1000;
  const save = () => {
    const id = exercise?.id ?? nextId(state);
    update((s) => ({
      ...s,
      nextId: Math.max(s.nextId, id + 1),
      exercises: exercise
        ? s.exercises.map((e) =>
            e.id === id ? { ...e, name: name.trim(), muscleGroup: muscleGroup.trim() } : e,
          )
        : [
            ...s.exercises,
            {
              id,
              name: name.trim(),
              mode,
              sortOrder: s.exercises.length,
              archived: false,
              muscleGroup: muscleGroup.trim(),
            },
          ],
      exerciseWeightSteps: exercise
        ? { ...s.exerciseWeightSteps, [id]: weightValue! }
        : s.exerciseWeightSteps,
      restTimerDisabledExerciseIds: [
        ...s.restTimerDisabledExerciseIds.filter((value) => value !== id),
        ...(!restTimerEnabled ? [id] : []),
      ],
      leftFirstExerciseIds: [
        ...s.leftFirstExerciseIds.filter((value) => value !== id),
        ...(left ? [id] : []),
      ],
    }));
    onAdded?.(id);
    onClose();
  };
  if (!exercise && !creating) {
    const groups = [...new Set([...muscleGroups, ...state.exercises.filter((item) => !item.archived).map(exerciseGroup)])];
    const candidates = state.exercises.filter((item) => !item.archived && !excludedIds.includes(item.id) && (!selectedGroup || exerciseGroup(item) === selectedGroup));
    return <Sheet title="種目を追加" onClose={onClose} popup>
        <Button label={showBody ? '人体図を閉じる' : '部位で絞り込む'} secondary onPress={() => setShowBody(!showBody)} />
        {showBody && <BodyRegionPicker onSelect={(group) => { setSelectedGroup(group); setMuscleGroup(group); setShowBody(false); }} />}
        <View style={[styles.wrap, { marginBottom: 12 }]}>
          <Chip label="すべて" active={!selectedGroup} onPress={() => setSelectedGroup(undefined)} />
          {groups.map((group) => <Chip key={group} label={group} active={selectedGroup === group} onPress={() => { setSelectedGroup(group); setMuscleGroup(group); }} />)}
        </View>
        {onAdded && <View style={[styles.wrap, { marginVertical: 12 }]}>
          {candidates.map((item) => <Chip key={item.id} label={item.name} onPress={() => { onAdded(item.id); onClose(); }} />)}
          {!candidates.length && <Text style={styles.small}>追加できる種目はありません。</Text>}
        </View>}
        <Button label="種目を作成" onPress={() => { if (!selectedGroup) setMuscleGroup(''); setCreating(true); }} />
    </Sheet>;
  }
  return (
    <Sheet title={exercise ? '種目を編集' : '種目を追加'} onClose={onClose} popup={!exercise}>
      <Field
        label="種目名"
        value={name}
        onChangeText={setName}
        maxLength={exercise ? 32 : undefined}
      />
      <Text style={[styles.body, { marginTop: 12 }]}>部位</Text>
      <View style={[styles.wrap, { marginVertical: 8 }]}>
        {[...new Set([...muscleGroups, muscleGroup])].filter(Boolean).map((group) => <Chip key={group} label={group} active={muscleGroup === group} onPress={() => setMuscleGroup(group)} />)}
      </View>
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
          <View style={styles.row}>
            <Text style={styles.body}>休憩</Text>
            <Switch value={restTimerEnabled} onValueChange={setRestTimerEnabled} />
          </View>
          {mode === 'BILATERAL' && (
            <>
              <View style={styles.row}>
                <Text style={styles.body}>左から開始</Text>
                <Switch value={left} onValueChange={setLeft} />
              </View>
            </>
          )}
          <Button
            label="共通設定に戻す"
            secondary
            onPress={() => {
              setWeight(String(state.weightStepKg));
              setLeft(false);
              setRestTimerEnabled(true);
              update((s) => ({
                ...s,
                exerciseWeightSteps: Object.fromEntries(
                  Object.entries(s.exerciseWeightSteps).filter(
                    ([key]) => key !== String(exercise.id),
                  ),
                ),
                restTimerDisabledExerciseIds: s.restTimerDisabledExerciseIds.filter(
                  (id) => id !== exercise.id,
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
