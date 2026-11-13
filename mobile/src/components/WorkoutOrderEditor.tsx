import { WeightWheel } from './WeightWheel';
import React, { useState } from 'react';
import { View } from 'react-native';
import { useApp } from '../context';
import { Button, Sheet } from '../ui';
import { currentCard as getCurrentCard, reorderWorkout, resizeSets, updateExerciseSets } from '../workout';
import { WorkoutNumberWheel } from './WorkoutNumberWheel';
import { ExerciseEditor } from './ExerciseEditor';
import { ExerciseOrderList } from './ExerciseOrderList';
import { ExercisePictogram } from './ExercisePictogram';
import { moveItem } from '../reorder';
import { addWorkoutExercises } from '../exercise-additions';
import { formatWeight } from '../logic';
import type { WorkoutCard } from '../types';

export function WorkoutOrderEditor({ sessionId, onClose, onJumpToSet, initialExerciseId }: { sessionId: number; onClose: () => void; onJumpToSet: (card: WorkoutCard) => void; initialExerciseId?: number }) {
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
  const currentCard = state.workout?.sessionId === sessionId ? getCurrentCard(state, sessionId) : undefined;
  const displayWeight = (weight?: number) => formatWeight(weight, state.weightUnit).replace(' ', '');
  return <Sheet title="種目を編集" onClose={onClose} scroll={false} bottomSheet>
    <ExerciseOrderList items={order.map((id) => {
      const exerciseSets = sets.filter((s) => s.exerciseId === id).sort((a, b) => a.setOrder - b.setOrder);
      const exerciseName = state.exercises.find((e) => e.id === id)?.name ?? '種目';
      const bilateral = state.exercises.find((e) => e.id === id)?.mode === 'BILATERAL';
      return { id, name: exerciseName, detail: `${exerciseSets.length}セット`,
        setRows: exerciseSets.map((set, index) => {
          const left = `左${displayWeight(set.leftWeightKg)}×${set.leftReps ?? '—'}${set.leftCompleted ? '✓' : ''}`;
          const right = `右${displayWeight(set.rightWeightKg)}×${set.rightReps ?? '—'}${set.rightCompleted ? '✓' : ''}`;
          const values = bilateral ? `${left} / ${right}` : `${displayWeight(set.normalWeightKg)}×${set.normalReps ?? '—'}`;
          const spokenValues = bilateral
            ? `左${displayWeight(set.leftWeightKg)} ${set.leftReps ?? '—'}回、右${displayWeight(set.rightWeightKg)} ${set.rightReps ?? '—'}回`
            : `${displayWeight(set.normalWeightKg)} ${set.normalReps ?? '—'}回`;
          const completed = bilateral ? set.isCompleted || (set.leftCompleted && set.rightCompleted) : set.isCompleted;
          const firstSide = state.leftFirstExerciseIds.includes(id) ? 'left' : 'right';
          const side = currentCard?.setId === set.id && currentCard.side ? currentCard.side
            : !set[`${firstSide}Completed`] ? firstSide : firstSide === 'left' ? 'right' : 'left';
          return { key: set.id, label: `${index + 1}セット目 / ${values}${completed ? ' ✓' : ''} / ›`,
            accessibilityLabel: `${exerciseName} ${index + 1}セット目 ${spokenValues}。タップで移動`,
            completed, current: currentCard?.setId === set.id,
            onPress: () => onJumpToSet(bilateral ? { setId: set.id, side } : { setId: set.id }) };
        }),
        stepper: { sets: exerciseSets.length,
          min: Math.max(1, exerciseSets.filter((s) => s.isCompleted || s.leftCompleted || s.rightCompleted).length), max: 30,
          onChange: (n: number) => update((s) => resizeSets(s, sessionId, id, n)) } };
    })}
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
