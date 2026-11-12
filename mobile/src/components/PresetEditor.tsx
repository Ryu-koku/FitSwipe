import React, { useState } from 'react';
import { Alert, Pressable, Switch, Text, View } from 'react-native';
import { useApp } from '../context';
import type { PresetExerciseConfig } from '../types';
import { addPresetExercises } from '../exercise-additions';
import { ExerciseEditor } from './ExerciseEditor';
import { Button, feedback, Field, NumberField, Sheet, useTheme } from '../ui';
import { ExerciseOrderList } from './ExerciseOrderList';
import { ExercisePictogram } from './ExercisePictogram';
import { AppIcon } from './AppIcon';
import { moveItem } from '../reorder';
import { PRESET_COLORS, presetColor } from '../logic';

export function PresetEditor({ presetId, onClose: close, initialExerciseId }: { presetId: string; onClose: () => void; initialExerciseId?: number }) {
  const { state, update } = useApp();
  const { colors, styles } = useTheme();
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
  const removeExercise = (id: number) => {
    update((s) => ({ ...s, presets: s.presets.map((p) => p.id === presetId ? { ...p, exercises: p.exercises.filter((c) => c.exerciseId !== id) } : p) }));
    if (editing === id) setEditing(undefined);
  };
  const confirmDelete = () => Alert.alert('プリセットを削除', `「${preset.name}」を削除しますか？`, [
    { text: 'キャンセル', style: 'cancel' },
    { text: '削除', style: 'destructive', onPress: () => {
      update((s) => ({ ...s, presets: s.presets.filter((p) => p.id !== presetId), selectedPresetId: s.selectedPresetId === presetId ? s.presets.find((p) => p.id !== presetId)?.id : s.selectedPresetId })); onClose();
    } },
  ]);
  return <Sheet title="プリセットを編集" onClose={onClose} scroll={false} bottomSheet
    right={<Pressable accessibilityRole="button" accessibilityLabel="プリセットを削除" onPress={() => { feedback(); confirmDelete(); }}
      style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
      <AppIcon name="trash" color={colors.red} />
    </Pressable>}>
    <ExerciseOrderList items={configs.map((c) => ({ id: c.exerciseId, name: state.exercises.find((e) => e.id === c.exerciseId)!.name, detail: `${c.sets}セット × ${c.reps ?? '—'}回` }))}
      onDelete={removeExercise} onEdit={setEditing} onMove={(from, to) => update((s) => ({ ...s, presets: s.presets.map((p) => p.id === presetId ? { ...p, exercises: moveItem(configs, from, to).concat(p.exercises.filter((c) => !configs.includes(c))) } : p) }))}
      header={<>
        <Field label="プリセット名" value={draftName ?? preset.name} maxLength={24} onChangeText={setDraftName} onBlur={commitName} />
        <Text style={styles.small}>カラー</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6, marginBottom: 12 }}>
          {PRESET_COLORS.map((color, index) => {
            const chosen = presetColor(preset, colors.primary) === color;
            return <Pressable key={color} accessibilityRole="radio" accessibilityState={{ selected: chosen }} accessibilityLabel={`カラー${index + 1}`}
              onPress={() => update((s) => ({ ...s, presets: s.presets.map((p) => p.id === presetId ? { ...p, color } : p) }))}
              style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: chosen ? colors.ink : 'transparent' }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: color }} />
            </Pressable>;
          })}
        </View>
      </>}
      footer={<Pressable accessibilityRole="button" accessibilityLabel="種目を追加"
        onPress={() => { feedback(); setAdding(true); }}
        style={({ pressed }) => ({ minHeight: 56, marginTop: 8, borderWidth: 1, borderStyle: 'dashed',
          borderColor: colors.primary, borderRadius: 16, flexDirection: 'row', alignItems: 'center',
          justifyContent: 'center', gap: 8, backgroundColor: pressed ? colors.soft : 'transparent' })}>
        <AppIcon name="plus" color={colors.primary} size={20} />
        <Text style={[styles.body, { color: colors.primary, fontWeight: '700' }]}>種目を追加</Text>
      </Pressable>} />
    {adding && <ExerciseEditor onClose={() => setAdding(false)}
      excludedIds={preset.exercises.map((item) => item.exerciseId)}
      onAdded={(ids) => update((s) => addPresetExercises(s, presetId, ids))} />}
    {config && exercise && <Sheet title={exercise.name} onClose={() => setEditing(undefined)}>
      <View style={{ alignItems: 'center', marginBottom: 12 }}><ExercisePictogram name={exercise.name} animate={false} /></View>
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
      <Button label="種目を削除" secondary onPress={() => removeExercise(exercise.id)} />
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
