import { canAddPreset } from '../premium';
import { usePremium } from '../premium-context';
import React, { useRef, useState } from 'react';
import { Alert, Keyboard, Text, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { useApp } from '../context';
import type { PresetExerciseConfig } from '../types';
import { exerciseDefaults } from '../workout';
import { moveItem } from '../reorder';
import { Button, Field, NumberField, Sheet, useTheme } from '../ui';
import { ExerciseEditor } from './ExerciseEditor';
import { ExerciseOrderList } from './ExerciseOrderList';

export function PresetCreator({ onClose }: { onClose: () => void }) {
  const { state, getState, persist } = useApp();
  const { premium, openPaywall } = usePremium();
  const { styles, colors } = useTheme();
  const [id] = useState(() => `preset-${randomUUID()}`);
  const [name, setName] = useState('');
  const [configs, setConfigs] = useState<PresetExerciseConfig[]>([]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<number>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const submitting = useRef(false);
  const config = configs.find((item) => item.exerciseId === editing);
  const exercise = state.exercises.find((item) => item.id === editing);
  const patch = (changes: Partial<PresetExerciseConfig>) => setConfigs((items) => items.map((item) =>
    item.exerciseId === editing ? { ...item, ...changes } : item));
  const close = () => {
    if (submitting.current) return;
    Keyboard.dismiss();
    if (!name.trim() && !configs.length) { onClose(); return; }
    Alert.alert('作成をやめますか？', '入力したプリセットは保存されません。', [
      { text: '入力を続ける', style: 'cancel' },
      { text: '破棄する', style: 'destructive', onPress: onClose },
    ]);
  };
  const save = async () => {
    if (submitting.current || !name.trim() || !configs.length) return;
    submitting.current = true;
    setSaving(true);
    setError(undefined);
    Keyboard.dismiss();
    const previousSelection = getState().selectedPresetId;
    try {
      await persist((current) => {
        if (!current.presets.some(item => item.id === id) && !canAddPreset(current, premium)) {
          openPaywall('無料プランのプリセットは3つまでです。');
          throw new Error('プリセット数が無料プランの上限に達しました。');
        }
        if (configs.some((item) => !current.exercises.some((e) => e.id === item.exerciseId && !e.archived))) {
          throw new Error('使えなくなった種目があります。一覧から削除して、選び直してください。');
        }
        // Retry with the same ID after a storage failure without duplicating it.
        const preset = { id, name: name.trim(), exercises: configs };
        return { ...current, presets: current.presets.some((item) => item.id === id)
          ? current.presets.map((item) => item.id === id ? preset : item)
          : [...current.presets, preset], selectedPresetId: id };
      });
      onClose();
    } catch (e) {
      // persist publishes optimistically; remove a failed creation from memory
      // as well so closing the draft cannot leave an incomplete preset behind.
      if (getState().presets.some((item) => item.id === id)) {
        await persist((current) => ({ ...current,
          presets: current.presets.filter((item) => item.id !== id),
          selectedPresetId: current.selectedPresetId === id ? previousSelection : current.selectedPresetId,
        })).catch(() => {});
      }
      setError(e instanceof Error ? e.message : '保存できませんでした。もう一度お試しください。');
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };
  return <Sheet title="プリセットを作成" onClose={close} fullScreen scroll={false}>
    <View style={{ flex: 1 }} pointerEvents={saving ? 'none' : 'auto'}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
        <Field label="プリセット名" placeholder="例：胸・肩の日、自宅トレーニング" value={name} onChangeText={setName} maxLength={24} />
      </View>
      <ExerciseOrderList items={configs.map((item) => ({ id: item.exerciseId,
        name: state.exercises.find((e) => e.id === item.exerciseId)?.name ?? '削除された種目',
        detail: `${item.sets}セット × ${item.reps ?? '—'}回 · ${state.exercises.find((e) => e.id === item.exerciseId)?.mode === 'BILATERAL' ? `左${item.leftWeightKg ?? 0} / 右${item.rightWeightKg ?? 0}` : item.weightKg ?? 0}kg`,
      }))}
        onEdit={(exerciseId) => { Keyboard.dismiss(); setEditing(exerciseId); }}
        onMove={(from, to) => setConfigs((items) => moveItem(items, from, to))}
        onDelete={(exerciseId) => setConfigs((items) => items.filter((item) => item.exerciseId !== exerciseId))}
        header={<View style={{ paddingBottom: 12 }}>
          <Text style={styles.sectionTitle}>種目{configs.length ? ` · ${configs.length}種目` : ''}</Text>
          <Text style={styles.small}>{configs.length ? 'タップで重量・回数・セット数を変更。ドラッグで並べ替え、左スワイプで削除。' : 'まずは種目を選びましょう。複数まとめて追加できます。'}</Text>
        </View>}
        footer={<Button label={configs.length ? '＋ 種目を追加' : '種目を選ぶ'} secondary={configs.length > 0}
          onPress={() => { Keyboard.dismiss(); setAdding(true); }} />} />
    </View>
    <View style={{ paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface }}>
      {error && <Text accessibilityRole="alert" style={{ color: colors.red, marginBottom: 8 }}>{error}</Text>}
      <Text style={styles.small}>{!name.trim() ? 'プリセット名を入力してください' : !configs.length ? '種目を1つ以上選んでください' : `${configs.length}種目 · 合計${configs.reduce((sum, item) => sum + item.sets, 0)}セット`}</Text>
      <Button label={saving ? '保存中…' : 'プリセットを作成'} disabled={saving || !name.trim() || !configs.length} onPress={() => { void save(); }} />
    </View>
    {adding && <ExerciseEditor onClose={() => setAdding(false)} excludedIds={configs.map((item) => item.exerciseId)}
      onAdded={(ids) => setConfigs((items) => [...items, ...[...new Set(ids)].flatMap((exerciseId) => {
        const item = getState().exercises.find((e) => e.id === exerciseId && !e.archived);
        return item && !items.some((c) => c.exerciseId === exerciseId) ? [exerciseDefaults(item)] : [];
      })])} />}
    {config && exercise && <Sheet title={exercise.name} onClose={() => setEditing(undefined)}>
      {exercise.mode === 'BILATERAL' ? <View style={styles.row}>
        <NumberField label="左kg" value={config.leftWeightKg} onChange={(leftWeightKg) => patch({ leftWeightKg })} />
        <NumberField label="右kg" value={config.rightWeightKg} onChange={(rightWeightKg) => patch({ rightWeightKg })} />
      </View> : <NumberField label="重量（kg）" value={config.weightKg} onChange={(weightKg) => patch({ weightKg })} />}
      <View style={styles.row}>
        <NumberField label="回数" value={config.reps} integer onChange={(reps) => patch({ reps })} />
        <NumberField label="セット数" value={config.sets} integer onChange={(sets) => patch({ sets: Math.max(1, Math.min(30, sets ?? 1)) })} />
      </View>
      <Button label="完了" onPress={() => setEditing(undefined)} />
      <Button label="この種目を外す" secondary onPress={() => {
        setConfigs((items) => items.filter((item) => item.exerciseId !== editing)); setEditing(undefined);
      }} />
    </Sheet>}
  </Sheet>;
}
