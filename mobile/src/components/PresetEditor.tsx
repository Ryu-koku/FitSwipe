import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useApp } from '../context';
import { activeExercises } from '../logic';
import type { PresetExerciseConfig } from '../types';
import { exerciseDefaults, numeric } from '../workout';
import {
  Button,
  Card,
  Chip,
  Field,
  IconButton,
  NumberField,
  Sheet,
  useTheme,
} from '../ui';
import { ReorderHandle } from './ReorderHandle';

export function PresetEditor({
  presetId,
  onClose,
}: {
  presetId: string;
  onClose: () => void;
}) {
  const { state, update } = useApp();
  const { styles } = useTheme();
  const [expanded, setExpanded] = useState<number>();
  const [adding, setAdding] = useState(false);
  const preset = state.presets.find((p) => p.id === presetId);
  if (!preset) return null;
  const patch = (id: number, changes: Partial<PresetExerciseConfig>) =>
    update((s) => ({
      ...s,
      presets: s.presets.map((p) =>
        p.id === presetId
          ? {
              ...p,
              exercises: p.exercises.map((c) =>
                c.exerciseId === id ? { ...c, ...changes } : c,
              ),
            }
          : p,
      ),
    }));
  const move = (index: number, delta: number) =>
    update((s) => ({
      ...s,
      presets: s.presets.map((p) => {
        if (p.id !== presetId) return p;
        const items = [...p.exercises];
        const target = Math.max(0, Math.min(items.length - 1, index + delta));
        const [item] = items.splice(index, 1);
        items.splice(target, 0, item);
        return { ...p, exercises: items };
      }),
    }));
  return (
    <Sheet title="プリセットを編集" onClose={onClose}>
      <Field
        label="プリセット名"
        value={preset.name}
        maxLength={24}
        onChangeText={(name) =>
          update((s) => ({
            ...s,
            presets: s.presets.map((p) =>
              p.id === presetId ? { ...p, name } : p,
            ),
          }))
        }
      />
      {preset.exercises.map((config, index) => {
        const exercise = state.exercises.find(
          (e) => e.id === config.exerciseId && !e.archived,
        );
        if (!exercise) return null;
        return (
          <Card key={config.exerciseId} style={{ padding: 12, marginTop: 8 }}>
            <View style={styles.row}>
              <Text
                style={[styles.body, { flex: 1, fontWeight: '700' }]}
                onPress={() =>
                  setExpanded(
                    expanded === exercise.id ? undefined : exercise.id,
                  )
                }
              >
                {exercise.name}　{expanded === exercise.id ? '⌃' : '⌄'}
              </Text>
              <ReorderHandle
                label={exercise.name}
                rowHeight={100}
                onMove={(offset) => move(index, offset)}
              />
              <IconButton
                label={`${exercise.name}を上へ`}
                symbol="↑"
                disabled={index === 0}
                onPress={() => move(index, -1)}
              />
              <IconButton
                label={`${exercise.name}を下へ`}
                symbol="↓"
                disabled={index === preset.exercises.length - 1}
                onPress={() => move(index, 1)}
              />
            </View>
            <Text style={styles.small}>
              {config.sets}セット × {config.reps ?? '—'}回
            </Text>
            {expanded === exercise.id && (
              <>
                <View style={styles.row}>
                  {exercise.mode === 'BILATERAL' ? (
                    <>
                      <NumberField
                        label="左kg"
                        value={config.leftWeightKg}
                        onChange={(v) =>
                          patch(exercise.id, { leftWeightKg: v })
                        }
                      />
                      <NumberField
                        label="右kg"
                        value={config.rightWeightKg}
                        onChange={(v) =>
                          patch(exercise.id, { rightWeightKg: v })
                        }
                      />
                    </>
                  ) : (
                    <NumberField
                      label="重量（kg）"
                      value={config.weightKg}
                      onChange={(v) => patch(exercise.id, { weightKg: v })}
                    />
                  )}
                </View>
                <View style={styles.row}>
                  <NumberField
                    label="回数"
                    value={config.reps}
                    integer
                    onChange={(v) => patch(exercise.id, { reps: v })}
                  />
                  <NumberField
                    label="セット数"
                    value={config.sets || undefined}
                    integer
                    onChange={(v) =>
                      patch(exercise.id, { sets: Math.min(30, v ?? 0) })
                    }
                  />
                </View>
                <RestField exerciseId={exercise.id} />
                <Button
                  label="種目を削除"
                  secondary
                  onPress={() =>
                    update((s) => ({
                      ...s,
                      presets: s.presets.map((p) =>
                        p.id === presetId
                          ? {
                              ...p,
                              exercises: p.exercises.filter(
                                (c) => c.exerciseId !== exercise.id,
                              ),
                            }
                          : p,
                      ),
                    }))
                  }
                />
              </>
            )}
          </Card>
        );
      })}
      <Button label="種目を追加" secondary onPress={() => setAdding(!adding)} />
      {adding && (
        <View style={[styles.wrap, { marginTop: 12 }]}>
          {activeExercises(state)
            .filter((e) => !preset.exercises.some((c) => c.exerciseId === e.id))
            .map((exercise) => (
              <Chip
                key={exercise.id}
                label={exercise.name}
                onPress={() => {
                  update((s) => ({
                    ...s,
                    presets: s.presets.map((p) =>
                      p.id === presetId
                        ? {
                            ...p,
                            exercises: [
                              ...p.exercises,
                              exerciseDefaults(exercise),
                            ],
                          }
                        : p,
                    ),
                  }));
                  setExpanded(exercise.id);
                  setAdding(false);
                }}
              />
            ))}
        </View>
      )}
      <Button
        label="このプリセットを削除"
        secondary
        onPress={() =>
          Alert.alert(
            'プリセットを削除',
            `「${preset.name}」を削除しますか？`,
            [
              { text: 'キャンセル', style: 'cancel' },
              {
                text: '削除',
                style: 'destructive',
                onPress: () => {
                  update((s) => {
                    const presets = s.presets.filter((p) => p.id !== presetId);
                    return {
                      ...s,
                      presets,
                      selectedPresetId:
                        s.selectedPresetId === presetId
                          ? presets[0]?.id
                          : s.selectedPresetId,
                    };
                  });
                  onClose();
                },
              },
            ],
          )
        }
      />
      <Button label="完了" onPress={onClose} />
    </Sheet>
  );
}

function RestField({ exerciseId }: { exerciseId: number }) {
  const { state, update } = useApp();
  const seconds = state.exerciseRestDurations[exerciseId];
  const [draft, setDraft] = useState(
    seconds !== undefined ? String(seconds / 60) : '',
  );
  const value = numeric(draft);
  return (
    <>
      <Field
        label="休憩（分・空欄で共通設定）"
        value={draft}
        onChangeText={setDraft}
        keyboardType="decimal-pad"
      />
      <Button
        label="休憩を保存"
        secondary
        disabled={!!draft.trim() && (value === undefined || value > 120)}
        onPress={() =>
          update((s) => ({
            ...s,
            exerciseRestDurations: Object.fromEntries([
              ...Object.entries(s.exerciseRestDurations).filter(
                ([id]) => id !== String(exerciseId),
              ),
              ...(value !== undefined
                ? [[String(exerciseId), Math.round(value * 60)]]
                : []),
            ]),
          }))
        }
      />
    </>
  );
}
