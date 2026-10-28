import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { useApp } from '../context';
import { activeExercises } from '../logic';
import type { PresetExerciseConfig } from '../types';
import { exerciseDefaults, numeric } from '../workout';
import { Button, Chip, Field, NumberField, Sheet, useTheme } from '../ui';
import { ExerciseOrderList } from './ExerciseOrderList';
import { moveItem } from '../reorder';

export function PresetEditor({ presetId, onClose }: { presetId: string; onClose: () => void }) {
  const { state, update } = useApp();
  const { styles } = useTheme();
  const [editing, setEditing] = useState<number>();
  const [adding, setAdding] = useState(false);
  const preset = state.presets.find((p) => p.id === presetId);
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
      header={<Field label="プリセット名" value={preset.name} maxLength={24} onChangeText={(name) => update((s) => ({ ...s, presets: s.presets.map((p) => p.id === presetId ? { ...p, name } : p) }))} />}
      footer={<>
        <Button label="種目を追加" secondary onPress={() => setAdding(!adding)} />
        {adding && <View style={styles.wrap}>{activeExercises(state).filter((e) => !preset.exercises.some((c) => c.exerciseId === e.id)).map((e) => <Chip key={e.id} label={e.name} onPress={() => {
          update((s) => ({ ...s, presets: s.presets.map((p) => p.id === presetId ? { ...p, exercises: [...p.exercises, exerciseDefaults(e)] } : p) })); setEditing(e.id); setAdding(false);
        }} />)}</View>}
        <Button label="完了" onPress={onClose} />
        <Button label="このプリセットを削除" secondary onPress={() => Alert.alert('プリセットを削除', `「${preset.name}」を削除しますか？`, [
          { text: 'キャンセル' }, { text: '削除', style: 'destructive', onPress: () => {
            update((s) => ({ ...s, presets: s.presets.filter((p) => p.id !== presetId), selectedPresetId: s.selectedPresetId === presetId ? s.presets.find((p) => p.id !== presetId)?.id : s.selectedPresetId })); onClose();
          } },
        ])} />
      </>} />
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
  const seconds = state.exerciseRestDurations[exerciseId];
  const [draft, setDraft] = useState(seconds !== undefined ? String(seconds / 60) : '');
  const value = numeric(draft);
  return <>
    <Field label="休憩（分・空欄で共通設定）" value={draft} onChangeText={setDraft} keyboardType="decimal-pad" />
    <Button label="休憩を保存" secondary disabled={!!draft.trim() && (value === undefined || value > 120)} onPress={() => update((s) => ({ ...s,
      exerciseRestDurations: Object.fromEntries([...Object.entries(s.exerciseRestDurations).filter(([id]) => id !== String(exerciseId)), ...(value !== undefined ? [[String(exerciseId), Math.round(value * 60)]] : [])]),
    }))} />
  </>;
}
