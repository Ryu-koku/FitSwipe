import { WeightWheel } from './WeightWheel';
import React, { useState } from 'react';
import { View } from 'react-native';
import { useApp } from '../context';
import { Button, Sheet } from '../ui';
import { reorderWorkout, resizeSets, updateExerciseSets } from '../workout';
import { WorkoutNumberWheel } from './WorkoutNumberWheel';
import { ExerciseEditor } from './ExerciseEditor';
import { ExerciseOrderList } from './ExerciseOrderList';
import { ExercisePictogram } from './ExercisePictogram';
import { moveItem } from '../reorder';
import { addWorkoutExercises } from '../exercise-additions';

export function WorkoutOrderEditor({ sessionId, onClose, initialExerciseId }: { sessionId: number; onClose: () => void; initialExerciseId?: number }) {
  const { state, update } = useApp();
  const [addNew, setAddNew] = useState(false);
  const [editing, setEditing] = useState<number | undefined>(initialExerciseId);
  const sets = state.sets.filter((s) => s.sessionId === sessionId);
  const order = [...new Set([...(state.workout?.exerciseOrder ?? []), ...sets.map((s) => s.exerciseId)])].filter((id) => sets.some((s) => s.exerciseId === id));
  const exercise = state.exercises.find((e) => e.id === editing);
  const rows = sets.filter((s) => s.exerciseId === editing).sort((a, b) => a.setOrder - b.setOrder);
  const first = rows.find((set) => !set.isCompleted) ?? rows.at(-1);
  const repsSide = exercise?.mode === 'BILATERAL' ? 'left' : 'normal';
  const patch = (changes: Parameters<typeof updateExerciseSets>[3]) => update((s) => updateExerciseSets(s, sessionId, exercise!.id, changes, new Date().toISOString()));
  const add = (ids: number[]) => update((s) => addWorkoutExercises(s, sessionId, ids));
  return <Sheet title="種目を編集" onClose={onClose} scroll={false} bottomSheet>
    <ExerciseOrderList items={order.map((id) => ({ id, name: state.exercises.find((e) => e.id === id)?.name ?? '種目', detail: `${sets.filter((s) => s.exerciseId === id).length}セット` }))}
      onDelete={(id) => update((s) => ({ ...s, sets: s.sets.filter((set) => !(set.sessionId === sessionId && set.exerciseId === id)), workout: s.workout ? { ...s.workout, exerciseOrder: s.workout.exerciseOrder.filter((exerciseId) => exerciseId !== id) } : undefined }))}
      onEdit={setEditing} onMove={(from, to) => update((s) => reorderWorkout(s, moveItem(order, from, to)))}
      footer={<>
        <Button label="種目を追加" secondary onPress={() => setAddNew(true)} />
      </>} />
    {exercise && <Sheet title={exercise.name} onClose={() => setEditing(undefined)} popup>
      <View style={{ alignItems: 'center', marginBottom: 12 }}><ExercisePictogram name={exercise.name} animate={false} /></View>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {(exercise.mode === 'BILATERAL' ? ['left', 'right'] as const : ['normal'] as const).map((side) =>
          <WeightWheel key={side} label={side === 'left' ? '左kg' : side === 'right' ? '右kg' : '重量（kg）'} unit="kg"
            step={state.exerciseWeightSteps[exercise.id] ?? state.weightStepKg}
            value={first?.skippedInputs?.[side] ? first.skippedInputs[side].weightKg : first?.[`${side}WeightKg`]}
            onChange={(value) => patch({ [`${side}WeightKg`]: value })} />)}
        <WorkoutNumberWheel label="回数" unit="回" step={1}
          value={first?.skippedInputs?.[repsSide] ? first.skippedInputs[repsSide].reps : first?.[`${repsSide}Reps`]}
          onChange={(reps) => patch(exercise.mode === 'BILATERAL' ? { leftReps: reps, rightReps: reps } : { normalReps: reps })} />
        <WorkoutNumberWheel label="セット数" unit="セット" step={1} min={1} max={30} value={rows.length}
          onChange={(n) => update((s) => resizeSets(s, sessionId, exercise.id, n))} />
      </View>
      <Button label="完了" onPress={() => setEditing(undefined)} />
      <Button label="種目を削除" secondary onPress={() => {
        update((s) => ({ ...s, sets: s.sets.filter((set) => !(set.sessionId === sessionId && set.exerciseId === editing)), workout: s.workout ? { ...s.workout, exerciseOrder: s.workout.exerciseOrder.filter((id) => id !== editing) } : undefined })); setEditing(undefined);
      }} />
    </Sheet>}
    {addNew && <ExerciseEditor onClose={() => setAddNew(false)} onAdded={add} excludedIds={order} />}
  </Sheet>;
}
