import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useApp } from '../context';
import { activeExercises } from '../logic';
import { Button, Chip, NumberField, Sheet, useTheme } from '../ui';
import { resizeSets, updateSet } from '../workout';
import { ExerciseEditor } from './ExerciseEditor';
import { ExerciseOrderList } from './ExerciseOrderList';
import { RestField } from './PresetEditor';
import { moveItem } from '../reorder';

export function WorkoutOrderEditor({ sessionId, onClose }: { sessionId: number; onClose: () => void }) {
  const { state, update } = useApp();
  const { styles } = useTheme();
  const [addNew, setAddNew] = useState(false);
  const [editing, setEditing] = useState<number>();
  const sets = state.sets.filter((s) => s.sessionId === sessionId);
  const order = [...new Set([...(state.workout?.exerciseOrder ?? []), ...sets.map((s) => s.exerciseId)])].filter((id) => sets.some((s) => s.exerciseId === id));
  const exercise = state.exercises.find((e) => e.id === editing);
  const rows = sets.filter((s) => s.exerciseId === editing).sort((a, b) => a.setOrder - b.setOrder);
  const add = (id: number) => update((s) => {
    const next = resizeSets(s, sessionId, id, 1);
    return { ...next, workout: next.workout ? { ...next.workout, exerciseOrder: [...new Set([...next.workout.exerciseOrder, id])] } : undefined };
  });
  return <Sheet title="種目を編集" onClose={onClose} scroll={false}>
    <ExerciseOrderList items={order.map((id) => ({ id, name: state.exercises.find((e) => e.id === id)?.name ?? '種目', detail: `${sets.filter((s) => s.exerciseId === id).length}セット` }))}
      onEdit={setEditing} onMove={(from, to) => update((s) => ({ ...s, workout: s.workout ? { ...s.workout, exerciseOrder: moveItem(order, from, to) } : undefined }))}
      footer={<>
        <Text style={styles.body}>種目を追加</Text><View style={styles.wrap}>{activeExercises(state).filter((e) => !order.includes(e.id)).map((e) => <Chip key={e.id} label={e.name} onPress={() => add(e.id)} />)}</View>
        <Button label="新しい種目を追加" secondary onPress={() => setAddNew(true)} />
        <Button label="完了" onPress={onClose} />
      </>} />
    {exercise && <Sheet title={exercise.name} onClose={() => setEditing(undefined)}>
      <NumberField label="セット数" value={rows.length} integer onChange={(n) => update((s) => resizeSets(s, sessionId, exercise.id, Math.min(30, n ?? 0)))} />
      {rows.map((set) => <View key={set.id} style={{ marginTop: 12 }}><Text style={styles.small}>セット {set.setOrder}{set.isCompleted ? ' · 完了' : ''}</Text>
        {(exercise.mode === 'BILATERAL' ? ['left', 'right'] as const : ['normal'] as const).map((side) => <View key={side} style={styles.row}>
          <NumberField label={`${side === 'left' ? '左' : side === 'right' ? '右' : ''}kg`} value={set[`${side}WeightKg`]} onChange={(v) => update((s) => updateSet(s, set.id, { [`${side}WeightKg`]: v }))} />
          <NumberField label="回数" value={set[`${side}Reps`]} integer onChange={(v) => update((s) => updateSet(s, set.id, { [`${side}Reps`]: v }))} />
        </View>)}</View>)}
      <RestField exerciseId={exercise.id} />
      <Button label="完了" onPress={() => setEditing(undefined)} />
      <Button label="種目を削除" secondary onPress={() => {
        update((s) => ({ ...s, sets: s.sets.filter((set) => !(set.sessionId === sessionId && set.exerciseId === editing)), workout: s.workout ? { ...s.workout, exerciseOrder: s.workout.exerciseOrder.filter((id) => id !== editing) } : undefined })); setEditing(undefined);
      }} />
    </Sheet>}
    {addNew && <ExerciseEditor onClose={() => setAddNew(false)} onAdded={add} />}
  </Sheet>;
}
