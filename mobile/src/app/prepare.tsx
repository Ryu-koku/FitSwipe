import { canAddPreset } from '../premium';
import { usePremium } from '../premium-context';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useApp } from '../context';
import { selectedPreset, formatWeight, presetColor } from '../logic';
import { Button, Card, Screen, SectionTitle, useTheme } from '../ui';
import { AppIcon } from '../components/AppIcon';
import { PresetEditor } from '../components/PresetEditor';
import { PresetCreator } from '../components/PresetCreator';
import { ExercisePictogram } from '../components/ExercisePictogram';

export default function PrepareScreen() {
  const { state, update } = useApp();
  const { premium, openPaywall } = usePremium();
  const startAdding = () => canAddPreset(state, premium) ? setAdding(true) : openPaywall('無料プランのプリセットは3つまでです。');
  const { colors, styles } = useTheme();
  const [editing, setEditing] = useState<string>();
  const [editingExercise, setEditingExercise] = useState<number>();
  const [adding, setAdding] = useState(false);
  const preset = selectedPreset(state);
  const configs = preset?.exercises.filter((c) => state.exercises.some((e) => e.id === c.exerciseId && !e.archived)) ?? [];
  const edit = (exerciseId?: number) => {
    if (!preset) return;
    setEditingExercise(exerciseId);
    setEditing(preset.id);
  };
  return (
    <Screen title="メニュー">
      <SectionTitle>プリセット</SectionTitle>
      <View style={[styles.wrap, { gap: 10 }]}>
        {state.presets.map((item) => {
          const selected = item.id === preset?.id;
          const color = presetColor(item, colors.primary);
          const items = item.exercises.filter((c) => state.exercises.some((e) => e.id === c.exerciseId && !e.archived));
          return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.name}
            accessibilityState={{ selected }}
            onPress={() => update((s) => ({ ...s, selectedPresetId: item.id }))}
            style={{ width: '48%' }}>
            <Card style={{ marginBottom: 0, padding: 12,
              backgroundColor: selected ? colors.soft : colors.surface,
              borderColor: selected ? color : colors.line, borderWidth: selected ? 2 : 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color, fontSize: 18 }}>{selected ? '●' : '○'}</Text>
                <Text numberOfLines={1} style={[styles.body, { flex: 1, fontSize: 17, fontWeight: '800' }]}>{item.name}</Text>
              </View>
              <Text style={styles.small}>{items.length}種目 · {items.reduce((sum, c) => sum + Math.max(1, c.sets), 0)}セット</Text>
            </Card>
          </Pressable>;
        })}
        <Pressable accessibilityRole="button" accessibilityLabel="プリセットを追加"
          onPress={startAdding} style={({ pressed }) => [{ width: '48%' }, pressed && styles.pressed]}>
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
            <Text style={styles.small}>{configs.length}種目 · {configs.reduce((sum, c) => sum + Math.max(1, c.sets), 0)}セット</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`${preset.name}を編集・並べ替え`}
            onPress={() => edit()} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
            <AppIcon name="edit" color={colors.primary} />
          </Pressable>
        </View>
        {configs.map((config) => {
          const exercise = state.exercises.find((e) => e.id === config.exerciseId)!;
          return <Card key={exercise.id} style={{ padding: 16 }}>
              <View style={[styles.row, { gap: 12 }]}>
                <ExercisePictogram name={exercise.name} preview animate={!editing && !adding} />
                <Pressable accessibilityRole="button" accessibilityLabel={`${exercise.name}を編集`}
                  onPress={() => edit(exercise.id)} style={({ pressed }) => [{ flex: 1, minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 8 }, pressed && styles.pressed]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.body, { fontWeight: '700', fontSize: 17 }]}>{exercise.name}</Text>
                  <Text style={[styles.small, { marginTop: 4 }]}>
                    {exercise.mode === 'BILATERAL'
                      ? `左 ${formatWeight(config.leftWeightKg)} / 右 ${formatWeight(config.rightWeightKg)}`
                      : formatWeight(config.weightKg)} × {config.reps ?? '—'}回 · {config.sets}セット
                  </Text>
                </View>
                <AppIcon name="next" color={colors.muted} size={18} />
                </Pressable>
              </View>
            </Card>;
        })}
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
