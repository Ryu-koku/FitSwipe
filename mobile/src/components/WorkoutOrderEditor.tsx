import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useApp } from '../context';
import { activeExercises } from '../logic';
import {
  Button,
  Card,
  Chip,
  IconButton,
  NumberField,
  Sheet,
  useTheme,
} from '../ui';
import { resizeSets, updateSet } from '../workout';
import { ExerciseEditor } from './ExerciseEditor';
import { ReorderableCard } from './ReorderableCard';

export function WorkoutOrderEditor({
  sessionId,
  onClose,
}: {
  sessionId: number;
  onClose: () => void;
}) {
  const { state, update } = useApp();
  const { styles } = useTheme();
  const [addNew, setAddNew] = useState(false);
  const [expanded, setExpanded] = useState<number>();
  const sets = state.sets.filter((s) => s.sessionId === sessionId);
  const order = [
    ...new Set([
      ...(state.workout?.exerciseOrder ?? []),
      ...sets.map((s) => s.exerciseId),
    ]),
  ].filter((id) => sets.some((s) => s.exerciseId === id));
  const move = (index: number, delta: number) =>
    update((s) => {
      const ids = [...order];
      const target = Math.max(0, Math.min(ids.length - 1, index + delta));
      const [id] = ids.splice(index, 1);
      ids.splice(target, 0, id);
      return {
        ...s,
        workout: s.workout ? { ...s.workout, exerciseOrder: ids } : undefined,
      };
    });
  const add = (id: number) =>
    update((s) => {
      const changed = resizeSets(s, sessionId, id, 1);
      return {
        ...changed,
        workout: changed.workout
          ? {
              ...changed.workout,
              exerciseOrder: [
                ...new Set([...changed.workout.exerciseOrder, id]),
              ],
            }
          : undefined,
      };
    });
  return (
    <Sheet title="種目の順番を編集" onClose={onClose}>
      {order.map((id, index) => {
        const exercise = state.exercises.find((e) => e.id === id);
        const rows = sets
          .filter((s) => s.exerciseId === id)
          .sort((a, b) => a.setOrder - b.setOrder);
        return (
          <ReorderableCard
            key={id}
            label={exercise?.name ?? '種目'}
            rowHeight={180}
            onMove={(offset) => move(index, offset)}
          >
            {(dragHandle) => (
              <Card>
                <View style={styles.row}>
                  <Text
                    style={[styles.body, { flex: 1, fontWeight: '700' }]}
                    onPress={() => setExpanded(expanded === id ? undefined : id)}
                  >
                    {exercise?.name} {rows.every((s) => s.isCompleted) ? '✓' : ''}
                  </Text>
                  {dragHandle}
                  <IconButton
                    label="上へ"
                    symbol="↑"
                    disabled={index === 0}
                    onPress={() => move(index, -1)}
                  />
                  <IconButton
                    label="下へ"
                    symbol="↓"
                    disabled={index === order.length - 1}
                    onPress={() => move(index, 1)}
                  />
                </View>
                <View style={styles.row}>
                  <Text style={styles.body}>{rows.length}セット</Text>
                  <IconButton
                    label="セットを減らす"
                    symbol="−"
                    onPress={() =>
                      update((s) => resizeSets(s, sessionId, id, rows.length - 1))
                    }
                  />
                  <IconButton
                    label="セットを増やす"
                    symbol="＋"
                    onPress={() =>
                      update((s) => resizeSets(s, sessionId, id, rows.length + 1))
                    }
                  />
                </View>
                {expanded === id &&
                  rows.map((set) => (
                    <View key={set.id} style={{ marginTop: 12 }}>
                      <Text style={styles.small}>
                        セット {set.setOrder}
                        {set.isCompleted ? ' · 完了' : ''}
                      </Text>
                      {(exercise?.mode === 'BILATERAL'
                        ? (['left', 'right'] as const)
                        : (['normal'] as const)
                      ).map((side) => (
                        <View key={side} style={styles.row}>
                          <NumberField
                            label={`${side === 'left' ? '左' : side === 'right' ? '右' : ''}kg`}
                            value={set[`${side}WeightKg`]}
                            onChange={(v) =>
                              update((s) =>
                                updateSet(s, set.id, { [`${side}WeightKg`]: v }),
                              )
                            }
                          />
                          <NumberField
                            label="回数"
                            value={set[`${side}Reps`]}
                            integer
                            onChange={(v) =>
                              update((s) =>
                                updateSet(s, set.id, { [`${side}Reps`]: v }),
                              )
                            }
                          />
                        </View>
                      ))}
                    </View>
                  ))}
                <Button
                  label="種目を削除"
                  secondary
                  onPress={() =>
                    update((s) => ({
                      ...s,
                      sets: s.sets.filter(
                        (set) =>
                          !(set.sessionId === sessionId && set.exerciseId === id),
                      ),
                      workout: s.workout
                        ? {
                            ...s.workout,
                            exerciseOrder: s.workout.exerciseOrder.filter(
                              (value) => value !== id,
                            ),
                          }
                        : undefined,
                    }))
                  }
                />
              </Card>
            )}
          </ReorderableCard>
        );
      })}
      <Text style={styles.body}>種目を追加</Text>
      <View style={[styles.wrap, { marginTop: 12 }]}>
        {activeExercises(state)
          .filter((e) => !order.includes(e.id))
          .map((e) => (
            <Chip key={e.id} label={e.name} onPress={() => add(e.id)} />
          ))}
      </View>
      <Button
        label="新しい種目を追加"
        secondary
        onPress={() => setAddNew(true)}
      />
      <Button label="完了" onPress={onClose} />
      {addNew && (
        <ExerciseEditor onClose={() => setAddNew(false)} onAdded={add} />
      )}
    </Sheet>
  );
}
