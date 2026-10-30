import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
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

export default function PrepareScreen() {
  const { state, update } = useApp();
  const { colors, styles } = useTheme();
  const [editing, setEditing] = useState<string>();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  return (
    <Screen title="トレーニング"
      overlay={<View pointerEvents="box-none" style={{ position: 'absolute', right: 20, bottom: 20 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="プリセットを追加"
          onPress={() => { setName(''); setAdding(true); }}
          style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 6 }}
        >
          <Text style={{ color: '#fff', fontSize: 34, lineHeight: 40 }}>＋</Text>
        </Pressable>
      </View>}>
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
                   paddingBottom: 60,
                  backgroundColor: selected ? colors.soft : colors.surface,
                  borderColor: selected ? colors.primary : colors.line,
                  borderWidth: selected ? 2 : 1,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: colors.primary, fontSize: 24 }}>
                    {selected ? '●' : '○'}
                  </Text>
                  <Text
                    style={[styles.body, { flex: 1, fontSize: 20, fontWeight: '800' }]}
                  >
                    {preset.name}
                  </Text>
                </View>
                <Text style={styles.small}>
                  {configs.length}種目 ·{' '}
                  {configs.reduce((sum, c) => sum + Math.max(1, c.sets), 0)}
                  セット
                </Text>
                <View style={{ position: 'absolute', right: 8, bottom: 8 }}>
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
      {editing && (
        <PresetEditor
          presetId={editing}
          onClose={() => setEditing(undefined)}
        />
      )}
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
