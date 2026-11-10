import React, { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { useApp } from '../context';
import { Button, NumberField, Sheet, useTheme } from '../ui';
import { reorderWorkout, resizeSets, updateSet } from '../workout';
import { ExerciseEditor } from './ExerciseEditor';
import { ExerciseOrderList } from './ExerciseOrderList';
import { ExercisePictogram } from './ExercisePictogram';
import { moveItem } from '../reorder';
import { addWorkoutExercises } from '../exercise-additions';

export function WorkoutOrderEditor({ sessionId, onClose, initialExerciseId }: { sessionId: number; onClose: () => void; initialExerciseId?: number }) {
  const { state, update } = useApp();
  const { styles } = useTheme();
  const [addNew, setAddNew] = useState(false);
  const [editing, setEditing] = useState<number | undefined>(initialExerciseId);
  const sets = state.sets.filter((s) => s.sessionId === sessionId);
  const order = [...new Set([...(state.workout?.exerciseOrder ?? []), ...sets.map((s) => s.exerciseId)])].filter((id) => sets.some((s) => s.exerciseId === id));
  const exercise = state.exercises.find((e) => e.id === editing);
  const rows = sets.filter((s) => s.exerciseId === editing).sort((a, b) => a.setOrder - b.setOrder);
  const add = (ids: number[]) => update((s) => addWorkoutExercises(s, sessionId, ids));
  return <Sheet title="種目を編集" onClose={onClose} scroll={false} bottomSheet>
    <ExerciseOrderList items={order.map((id) => ({ id, name: state.exercises.find((e) => e.id === id)?.name ?? '種目', detail: `${sets.filter((s) => s.exerciseId === id).length}セット` }))}
      header={<View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 8, marginBottom: 12 }}>
        <Text style={styles.body}>休憩</Text>
        <Switch accessibilityLabel="ワークアウトの休憩" value={order.length > 0 && order.every((id) => !state.restTimerDisabledExerciseIds.includes(id))}
          disabled={!order.length}
          onValueChange={(enabled) => update((s) => ({ ...s,
            restTimerDisabledExerciseIds: [...s.restTimerDisabledExerciseIds.filter((id) => !order.includes(id)), ...(!enabled ? order : [])],
          }))} />
      </View>}
      onDelete={(id) => update((s) => ({ ...s, sets: s.sets.filter((set) => !(set.sessionId === sessionId && set.exerciseId === id)), workout: s.workout ? { ...s.workout, exerciseOrder: s.workout.exerciseOrder.filter((exerciseId) => exerciseId !== id) } : undefined }))}
      onEdit={setEditing} onMove={(from, to) => update((s) => reorderWorkout(s, moveItem(order, from, to)))}
      footer={<>
        <Button label="種目を追加" secondary onPress={() => setAddNew(true)} />
      </>} />
    {exercise && <Sheet title={exercise.name} onClose={() => setEditing(undefined)} popup>
      <View style={{ alignItems: 'center', marginBottom: 12 }}><ExercisePictogram name={exercise.name} animate={false} /></View>
      <NumberField label="セット数" value={rows.length} integer onChange={(n) => update((s) => resizeSets(s, sessionId, exercise.id, Math.min(30, n ?? 0)))} />
      {rows.map((set) => <View key={set.id} style={{ marginTop: 12 }}><Text style={styles.small}>セット {set.setOrder}{set.isCompleted ? ' · 完了' : ''}</Text>
        {(exercise.mode === 'BILATERAL' ? ['left', 'right'] as const : ['normal'] as const).map((side) => <View key={side} style={styles.row}>
          <NumberField label={`${side === 'left' ? '左' : side === 'right' ? '右' : ''}kg`} value={set.skippedInputs?.[side] ? set.skippedInputs[side].weightKg : set[`${side}WeightKg`]} onChange={(v) => update((s) => updateSet(s, set.id, { [`${side}WeightKg`]: v }))} />
          <NumberField label="回数" value={set.skippedInputs?.[side] ? set.skippedInputs[side].reps : set[`${side}Reps`]} integer onChange={(v) => update((s) => updateSet(s, set.id, { [`${side}Reps`]: v }))} />
        </View>)}</View>)}
      <Button label="完了" onPress={() => setEditing(undefined)} />
      <Button label="種目を削除" secondary onPress={() => {
        update((s) => ({ ...s, sets: s.sets.filter((set) => !(set.sessionId === sessionId && set.exerciseId === editing)), workout: s.workout ? { ...s.workout, exerciseOrder: s.workout.exerciseOrder.filter((id) => id !== editing) } : undefined })); setEditing(undefined);
      }} />
    </Sheet>}
    {addNew && <ExerciseEditor onClose={() => setAddNew(false)} onAdded={add} excludedIds={order} />}
  </Sheet>;
}
