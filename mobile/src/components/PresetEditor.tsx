import React, { useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import { useApp } from '../context';
import type { PresetExerciseConfig } from '../types';
import { addPresetExercises } from '../exercise-additions';
import { ExerciseEditor } from './ExerciseEditor';
import { Button, Field, NumberField, Sheet, useTheme } from '../ui';
import { ExerciseOrderList } from './ExerciseOrderList';
import { moveItem } from '../reorder';

export function PresetEditor({ presetId, onClose: close, initialExerciseId }: { presetId: string; onClose: () => void; initialExerciseId?: number }) {
  const { state, update } = useApp();
  const { styles } = useTheme();
  const [editing, setEditing] = useState<number | undefined>(initialExerciseId);
  const [adding, setAdding] = useState(false);
  // Edit the name locally and save it once: a blank name keeps the old one, and
  // typing does not queue one sync change per keystroke.
  const [draftName, setDraftName] = useState<string>();
  const preset = state.presets.find((p) => p.id === presetId);
  const commitName = () => {
    const name = draftName?.trim();
    if (name && name !== preset?.name) update((s) => ({ ...s, presets: s.presets.map((p) => p.id === presetId ? { ...p, name } : p) }));
    setDraftName(undefined);
  };
  const onClose = () => { commitName(); close(); };
  if (!preset) return null;
  const configs = preset.exercises.filter((c) => state.exercises.some((e) => e.id === c.exerciseId && !e.archived));
  const config = configs.find((c) => c.exerciseId === editing);
  const exercise = state.exercises.find((e) => e.id === editing);
  const patch = (changes: Partial<PresetExerciseConfig>) => update((s) => ({ ...s,
    presets: s.presets.map((p) => p.id === presetId ? { ...p, exercises: p.exercises.map((c) => c.exerciseId === editing ? { ...c, ...changes } : c) } : p),
  }));
  return <Sheet title="プリセットを編集" onClose={onClose} scroll={false}>
    <ExerciseOrderList items={configs.map((c) => ({ id: c.exerciseId, name: state.exercises.find((e) => e.id === c.exerciseId)!.name, detail: `${c.sets}セット × ${c.reps ?? '—'}回` }))}
      onEdit={setEditing} onMove={(from, to) => update((s) => ({ ...s, presets: s.presets.map((p) => p.id === presetId ? { ...p, exercises: moveItem(configs, from, to).concat(p.exercises.filter((c) => !configs.includes(c))) } : p) }))}
      header={<Field label="プリセット名" value={draftName ?? preset.name} maxLength={24} onChangeText={setDraftName} onBlur={commitName} />}
      footer={<>
        <Button label="種目を追加" secondary onPress={() => setAdding(true)} />
        <Button label="完了" onPress={onClose} />
        <Button label="このプリセットを削除" secondary onPress={() => Alert.alert('プリセットを削除', `「${preset.name}」を削除しますか？`, [
          { text: 'キャンセル' }, { text: '削除', style: 'destructive', onPress: () => {
            update((s) => ({ ...s, presets: s.presets.filter((p) => p.id !== presetId), selectedPresetId: s.selectedPresetId === presetId ? s.presets.find((p) => p.id !== presetId)?.id : s.selectedPresetId })); onClose();
          } },
        ])} />
      </>} />
    {adding && <ExerciseEditor onClose={() => setAdding(false)}
      excludedIds={preset.exercises.map((item) => item.exerciseId)}
      onAdded={(ids) => update((s) => addPresetExercises(s, presetId, ids))} />}
    {config && exercise && <Sheet title={exercise.name} onClose={() => setEditing(undefined)}>
      {exercise.mode === 'BILATERAL' ? <View style={styles.row}>
        <NumberField label="左kg" value={config.leftWeightKg} onChange={(leftWeightKg) => patch({ leftWeightKg })} />
        <NumberField label="右kg" value={config.rightWeightKg} onChange={(rightWeightKg) => patch({ rightWeightKg })} />
      </View> : <NumberField label="重量（kg）" value={config.weightKg} onChange={(weightKg) => patch({ weightKg })} />}
      <View style={styles.row}>
        <NumberField label="回数" value={config.reps} integer onChange={(reps) => patch({ reps })} />
        <NumberField label="セット数" value={config.sets} integer onChange={(sets) => patch({ sets: Math.min(30, sets ?? 0) })} />
      </View>
      <RestField exerciseId={exercise.id} />
      <Button label="完了" onPress={() => setEditing(undefined)} />
      <Button label="種目を削除" secondary onPress={() => {
        update((s) => ({ ...s, presets: s.presets.map((p) => p.id === presetId ? { ...p, exercises: p.exercises.filter((c) => c.exerciseId !== editing) } : p) })); setEditing(undefined);
      }} />
    </Sheet>}
  </Sheet>;
}

export function RestField({ exerciseId }: { exerciseId: number }) {
  const { state, update } = useApp();
  const { styles } = useTheme();
  return <View style={[styles.row, { justifyContent: 'space-between', marginVertical: 12 }]}>
    <Text style={styles.body}>休憩</Text>
    <Switch accessibilityLabel="休憩" value={!state.restTimerDisabledExerciseIds.includes(exerciseId)}
      onValueChange={(enabled) => update((s) => ({ ...s,
        restTimerDisabledExerciseIds: [...s.restTimerDisabledExerciseIds.filter((id) => id !== exerciseId), ...(!enabled ? [exerciseId] : [])],
      }))} />
  </View>;
}
