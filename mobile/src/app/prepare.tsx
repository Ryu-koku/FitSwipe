import { canAddPreset } from '../premium';
import { usePremium } from '../premium-context';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useApp } from '../context';
import { selectedPreset, presetColor } from '../logic';
import { feedback, Button, Card, Screen, SectionTitle, useTheme } from '../ui';
import { AppIcon } from '../components/AppIcon';
import { PresetEditor } from '../components/PresetEditor';
import { PresetCreator } from '../components/PresetCreator';
import { PrepareExerciseCard } from '../components/PrepareExerciseCard';

export default function PrepareScreen() {
  const { state, update } = useApp();
  const active = state.sessions.some((s) => s.status === 'IN_PROGRESS');
  useEffect(() => {
    if (active) router.replace('/workout');
  }, [active]);
  const { premium, openPaywall } = usePremium();
  const startAdding = () => canAddPreset(state, premium) ? setAdding(true) : openPaywall('無料プランのプリセットは3つまでです。');
  const { colors, styles } = useTheme();
  const [editing, setEditing] = useState<string>();
  const [editingExercise, setEditingExercise] = useState<number>();
  const [adding, setAdding] = useState(false);
  const preset = selectedPreset(state);
  const activeExerciseIds = useMemo(() => new Set(state.exercises.filter((e) => !e.archived).map((e) => e.id)), [state.exercises]);
  const exercisesById = useMemo(() => new Map(state.exercises.map((e) => [e.id, e])), [state.exercises]);
  const summaries = useMemo(() => new Map(state.presets.map((item) => {
    const configs = item.exercises.filter((c) => activeExerciseIds.has(c.exerciseId));
    return [item.id, { configs, sets: configs.reduce((sum, c) => sum + Math.max(1, c.sets), 0) }];
  })), [state.presets, activeExerciseIds]);
  const summary = preset && summaries.get(preset.id);
  const configs = summary?.configs ?? [];
  const presetId = state.presets.find((item) => item.id === state.selectedPresetId)?.id ?? state.presets[0]?.id;
  const edit = useCallback((exerciseId?: number) => {
    if (!presetId) return;
    setEditingExercise(exerciseId);
    setEditing(presetId);
  }, [presetId, setEditing, setEditingExercise]);
  if (active) return null;
  return (
    <Screen title="メニュー">
      <SectionTitle>プリセット</SectionTitle>
      <View style={[styles.wrap, { gap: 10 }]}>
        {state.presets.map((item) => {
          const selected = item.id === preset?.id;
          const color = presetColor(item, colors.primary);
          const summary = summaries.get(item.id)!;
          return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.name}
            accessibilityState={{ selected }}
            onPress={() => { feedback(); return update((s) => ({ ...s, selectedPresetId: item.id })); }}
            style={{ width: '48%' }}>
            <Card style={{ marginBottom: 0, padding: 12,
              backgroundColor: selected ? colors.soft : colors.surface,
              borderColor: selected ? color : colors.line, borderWidth: selected ? 2 : 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color, fontSize: 18 }}>{selected ? '●' : '○'}</Text>
                <Text numberOfLines={1} style={[styles.body, { flex: 1, fontSize: 17, fontWeight: '800' }]}>{item.name}</Text>
              </View>
              <Text style={styles.small}>{summary.configs.length}種目 · {summary.sets}セット</Text>
            </Card>
          </Pressable>;
        })}
        <Pressable accessibilityRole="button" accessibilityLabel="プリセットを追加"
          onPress={() => { feedback(); startAdding(); }} style={({ pressed }) => [{ width: '48%' }, pressed && styles.pressed]}>
          <Card style={{ marginBottom: 0, padding: 12, minHeight: 74,
            justifyContent: 'center', alignItems: 'center', borderColor: colors.line, borderWidth: 1 }}>
            <Text style={[styles.body, { color: colors.primary, fontWeight: '700' }]}>＋ プリセットを追加</Text>
          </Card>
        </Pressable>
      </View>
      {preset ? <>
        <View style={[styles.row, { marginTop: 16, marginBottom: 16 }]}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: presetColor(preset, colors.primary) }} />
              <Text style={[styles.body, { fontWeight: '800', fontSize: 18 }]}>{preset.name}</Text>
            </View>
            <Text style={styles.small}>{configs.length}種目 · {summary?.sets}セット</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`${preset.name}を編集・並べ替え`}
            onPress={() => { feedback(); return edit(); }} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
            <AppIcon name="edit" color={colors.primary} />
          </Pressable>
        </View>
        {configs.map((config) => <PrepareExerciseCard key={config.exerciseId}
          exercise={exercisesById.get(config.exerciseId)!} config={config}
          weightUnit={state.weightUnit} animate={!editing && !adding} onEdit={edit} />)}
        {!configs.length && <Card><Text style={styles.body}>種目を追加して、トレーニングの準備をしましょう。</Text></Card>}
        <Button label="メニューを編集・種目を追加" secondary onPress={() => edit()} />
      </> : <Card style={{ marginTop: 16 }}>
        <Text style={styles.body}>よく使う種目をまとめて、トレーニングを始めましょう。</Text>
      </Card>}
      {editing && <PresetEditor presetId={editing} initialExerciseId={editingExercise}
        onClose={() => { setEditing(undefined); setEditingExercise(undefined); }} />}
      {adding && <PresetCreator onClose={() => setAdding(false)} />}
    </Screen>
  );
}
