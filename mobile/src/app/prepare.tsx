import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../context';
import {
  Button,
  Card,
  Field,
  IconButton,
  Screen,
  SectionTitle,
  Sheet,
  useTheme,
} from '../ui';
import { PresetEditor } from '../components/PresetEditor';
import { ExerciseEditor } from '../components/ExerciseEditor';

export default function PrepareScreen() {
  const { state, update } = useApp();
  const { colors, styles } = useTheme();
  const [editing, setEditing] = useState<string>();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [exercise, setExercise] = useState(false);
  return (
    <Screen title="トレーニング" onBack={() => router.replace('/')}>
      <SectionTitle>プリセット</SectionTitle>
      <View style={[styles.wrap, { gap: 10 }]}>
        {state.presets.map((preset) => {
          const selected = preset.id === state.selectedPresetId;
          const configs = preset.exercises.filter((c) =>
            state.exercises.some((e) => e.id === c.exerciseId && !e.archived),
          );
          return (
            <Pressable
              key={preset.id}
              accessibilityRole="button"
              accessibilityLabel={preset.name}
              accessibilityState={{ selected }}
              onPress={() =>
                update((s) => ({ ...s, selectedPresetId: preset.id }))
              }
              style={{ width: '48%' }}
            >
              <Card
                style={{
                  minHeight: 150,
                  backgroundColor: selected ? colors.soft : colors.surface,
                  borderColor: selected ? colors.primary : colors.line,
                  borderWidth: selected ? 2 : 1,
                }}
              >
                <Text style={{ color: colors.primary, fontSize: 24 }}>
                  {selected ? '●' : '○'}
                </Text>
                <Text
                  style={[styles.body, { fontWeight: '800', marginTop: 10 }]}
                >
                  {preset.name}
                </Text>
                <Text style={styles.small}>
                  {configs.length}種目 ·{' '}
                  {configs.reduce((sum, c) => sum + Math.max(1, c.sets), 0)}
                  セット
                </Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <IconButton
                    label={`${preset.name}を編集`}
                    symbol="✎"
                    onPress={() => {
                      update((s) => ({ ...s, selectedPresetId: preset.id }));
                      setEditing(preset.id);
                    }}
                  />
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>
      <Button
        label="＋ プリセットを追加"
        secondary
        onPress={() => {
          setName('');
          setAdding(true);
        }}
      />
      <Button label="種目を追加" secondary onPress={() => setExercise(true)} />
      {editing && (
        <PresetEditor
          presetId={editing}
          onClose={() => setEditing(undefined)}
        />
      )}
      {exercise && <ExerciseEditor onClose={() => setExercise(false)} />}
      {adding && (
        <Sheet title="プリセットを追加" onClose={() => setAdding(false)}>
          <Field
            label="名前"
            value={name}
            onChangeText={setName}
            maxLength={24}
          />
          <Button
            label="作成して編集"
            disabled={!name.trim()}
            onPress={() => {
              const id = `preset-${Date.now()}`;
              update((s) => ({
                ...s,
                presets: [
                  ...s.presets,
                  { id, name: name.trim(), exercises: [] },
                ],
                selectedPresetId: id,
              }));
              setAdding(false);
              setEditing(id);
            }}
          />
        </Sheet>
      )}
    </Screen>
  );
}
