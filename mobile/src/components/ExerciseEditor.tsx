import React, { useRef, useState } from 'react';
import { FlatList, Keyboard, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useApp } from '../context';
import type { Exercise, ExerciseMode } from '../types';
import { numeric, nextId } from '../workout';
import { Button, Chip, Field, Sheet, useTheme } from '../ui';
import { exerciseGroup, muscleGroups } from '../exercise-groups';
import { ExercisePictogram } from './ExercisePictogram';
import { useRefreshExerciseVisibility } from '../exercise-motion';
import { availableExerciseChoices } from '../exercise-additions';

export function ExerciseEditor({
  exercise,
  onClose,
  onAdded,
  excludedIds = [],
}: {
  exercise?: Exercise;
  onClose: () => void;
  onAdded?: (ids: number[]) => void;
  excludedIds?: number[];
}) {
  const { state, update, getState } = useApp();
  const { styles, colors } = useTheme();
  const refreshIllustrations = useRefreshExerciseVisibility();
  const [name, setName] = useState(exercise?.name ?? '');
  const [mode, setMode] = useState<ExerciseMode>(exercise?.mode ?? 'NORMAL');
  const [muscleGroup, setMuscleGroup] = useState(exercise ? exerciseGroup(exercise) : '');
  const [selectedGroup, setSelectedGroup] = useState<string>();
  const [creating, setCreating] = useState(!onAdded);
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const submitted = useRef(false);
  const available = availableExerciseChoices(state.exercises, excludedIds);
  const selected = selectedIds.filter((id) => available.some((item) => item.id === id));
  const backToList = !exercise && onAdded && creating ? () => {
    Keyboard.dismiss();
    setCreating(false);
  } : undefined;
  const [weight, setWeight] = useState(
    String(
      exercise
        ? (state.exerciseWeightSteps[exercise.id] ?? state.weightStepKg)
        : state.weightStepKg,
    ),
  );
  const [left, setLeft] = useState(
    exercise ? state.leftFirstExerciseIds.includes(exercise.id) : false,
  );
  const [restTimerEnabled, setRestTimerEnabled] = useState(
    exercise ? !state.restTimerDisabledExerciseIds.includes(exercise.id) : true,
  );
  const weightValue = numeric(weight);
  const valid =
    !!name.trim() &&
    !!muscleGroup.trim() &&
    weightValue !== undefined &&
    weightValue >= 0.01 &&
    weightValue <= 1000;
  const save = () => {
    if (!valid || submitted.current) return;
    submitted.current = true;
    Keyboard.dismiss();
    const id = exercise?.id ?? nextId(getState());
    update((s) => ({
      ...s,
      nextId: Math.max(s.nextId, id + 1),
      exercises: exercise
        ? s.exercises.map((e) =>
            e.id === id ? { ...e, name: name.trim(), muscleGroup: muscleGroup.trim() } : e,
          )
        : [
            ...s.exercises,
            {
              id,
              name: name.trim(),
              mode,
              sortOrder: s.exercises.length,
              archived: false,
              muscleGroup: muscleGroup.trim(),
            },
          ],
      exerciseWeightSteps: exercise
        ? { ...s.exerciseWeightSteps, [id]: weightValue! }
        : s.exerciseWeightSteps,
      restTimerDisabledExerciseIds: [
        ...s.restTimerDisabledExerciseIds.filter((value) => value !== id),
        ...(!restTimerEnabled ? [id] : []),
      ],
      leftFirstExerciseIds: [
        ...s.leftFirstExerciseIds.filter((value) => value !== id),
        ...(left ? [id] : []),
      ],
    }));
    onAdded?.([...selected, id]);
    onClose();
  };
  if (!exercise && !creating) {
    const groups = [...new Set([...muscleGroups, ...state.exercises.filter((item) => !item.archived).map(exerciseGroup)])];
    const search = query.normalize('NFKC').trim().toLocaleLowerCase();
    const candidates = available.filter((item) =>
      (!selectedGroup || exerciseGroup(item) === selectedGroup) &&
      item.name.normalize('NFKC').toLocaleLowerCase().includes(search),
    ).sort((a, b) => a.sortOrder - b.sortOrder);
    const startCreating = () => {
      Keyboard.dismiss();
      setName(query.trim());
      setMuscleGroup(selectedGroup ?? '');
      setCreating(true);
    };
    return <Sheet title="種目を追加" onClose={onClose} fullScreen scroll={false}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
        <Field label="種目を検索" placeholder="種目名で検索" value={query} onChangeText={setQuery} />
      </View>
      <FlatList data={candidates} extraData={selectedIds} keyExtractor={(item) => String(item.id)}
        style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}
        onScroll={refreshIllustrations} scrollEventThrottle={100}
        keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
        ListHeaderComponent={<View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: 12 }}>
          <Chip label="すべて" active={!selectedGroup} onPress={() => setSelectedGroup(undefined)} />
          {groups.map((group) => <Chip key={group} label={group} active={selectedGroup === group} onPress={() => setSelectedGroup((current) => current === group ? undefined : group)} />)}
        </ScrollView>
        <Text style={styles.small}>追加する種目を選択 · {candidates.length}件</Text>
        </View>}
        ListEmptyComponent={<View style={{ paddingVertical: 24 }}>
          <Text style={styles.body}>{search || selectedGroup ? '条件に合う種目がありません' : '追加できる種目はありません'}</Text>
          <Text style={[styles.small, { marginTop: 8 }]}>新しい種目は下のボタンから作成できます。</Text>
          {(!!search || !!selectedGroup) && <Button label="検索と絞り込みを解除" secondary onPress={() => { setQuery(''); setSelectedGroup(undefined); }} />}
        </View>}
        renderItem={({ item }) => {
          const checked = selected.includes(item.id);
          return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 88,
              paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.line,
              backgroundColor: checked ? colors.soft : colors.bg }}>
            <ExercisePictogram name={item.name} preview />
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }}
              accessibilityLabel={`${item.name}、${exerciseGroup(item)}`}
              onPress={() => setSelectedIds((ids) => ids.includes(item.id) ? ids.filter((id) => id !== item.id) : [...ids, item.id])}
              style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, opacity: pressed ? 0.7 : 1 })}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.body, { fontWeight: '700' }]}>{item.name}</Text>
              <Text style={styles.small}>{exerciseGroup(item)}{item.mode === 'BILATERAL' ? ' · 左右別' : ''}</Text>
            </View>
            <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: checked ? colors.primary : colors.muted,
              backgroundColor: checked ? colors.primary : colors.surface, alignItems: 'center', justifyContent: 'center' }}>
              {checked && <Text style={{ color: colors.surface, fontWeight: '800' }}>✓</Text>}
            </View>
            </Pressable>
          </View>;
        }} />
      <View style={{ paddingHorizontal: 20, paddingBottom: 12, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface }}>
        <Button label="＋ 新しい種目を作成" secondary onPress={startCreating} />
        <Button label={selected.length ? `${selected.length}種目を追加` : '種目を選択してください'} disabled={!selected.length} onPress={() => {
          if (submitted.current || !selected.length) return;
          submitted.current = true;
          Keyboard.dismiss();
          onAdded?.(selected);
          onClose();
        }} />
      </View>
    </Sheet>;
  }
  return (
    <Sheet title={exercise ? '種目を編集' : '新しい種目を作成'} onClose={onClose} onBack={backToList} fullScreen={!exercise} scroll={false}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
      {exercise && <View style={{ alignItems: 'center', marginBottom: 12 }}><ExercisePictogram name={exercise.name} animate={false} /></View>}
      <Field
        label="種目名"
        value={name}
        onChangeText={setName}
        maxLength={32}
      />
      <Text style={[styles.body, { marginTop: 12 }]}>部位</Text>
      <View style={[styles.wrap, { marginVertical: 8 }]}>
        {[...new Set([...muscleGroups, muscleGroup])].filter(Boolean).map((group) => <Chip key={group} label={group} active={muscleGroup === group} onPress={() => setMuscleGroup(group)} />)}
      </View>
      {!exercise && (
        <View style={[styles.wrap, { marginTop: 12 }]}>
          <Chip
            label="通常"
            active={mode === 'NORMAL'}
            onPress={() => setMode('NORMAL')}
          />
          <Chip
            label="左右別"
            active={mode === 'BILATERAL'}
            onPress={() => setMode('BILATERAL')}
          />
        </View>
      )}
      {exercise && (
        <>
          <Field
            label="重量の刻み幅（kg）"
            keyboardType="decimal-pad"
            value={weight}
            onChangeText={setWeight}
          />
          <View style={styles.row}>
            <Text style={styles.body}>休憩</Text>
            <Switch value={restTimerEnabled} onValueChange={setRestTimerEnabled} />
          </View>
          {mode === 'BILATERAL' && (
            <>
              <View style={styles.row}>
                <Text style={styles.body}>左から開始</Text>
                <Switch value={left} onValueChange={setLeft} />
              </View>
            </>
          )}
          <Button
            label="共通設定に戻す"
            secondary
            onPress={() => {
              setWeight(String(state.weightStepKg));
              setLeft(false);
              setRestTimerEnabled(true);
              update((s) => ({
                ...s,
                exerciseWeightSteps: Object.fromEntries(
                  Object.entries(s.exerciseWeightSteps).filter(
                    ([key]) => key !== String(exercise.id),
                  ),
                ),
                restTimerDisabledExerciseIds: s.restTimerDisabledExerciseIds.filter(
                  (id) => id !== exercise.id,
                ),
                leftFirstExerciseIds: s.leftFirstExerciseIds.filter(
                  (id) => id !== exercise.id,
                ),
                sideSwitchRestExerciseIds: s.sideSwitchRestExerciseIds.filter(
                  (id) => id !== exercise.id,
                ),
              }));
            }}
          />
        </>
      )}
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingBottom: 12, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface }}>
      {!exercise && onAdded && selected.length > 0 && <Text style={[styles.small, { marginTop: 12 }]}>選択済みの{selected.length}種目も一緒に追加します。</Text>}
      <Button
        label={exercise ? '保存' : onAdded ? `作成して${selected.length + 1}種目を追加` : '種目を作成'}
        disabled={!valid}
        onPress={save}
      />
      </View>
    </Sheet>
  );
}
