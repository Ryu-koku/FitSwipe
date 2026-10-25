import React, { useState } from 'react';
import { BackHandler, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useApp } from '../context';
import {
  Button,
  Card,
  Chip,
  Field,
  Screen,
  SectionTitle,
  useTheme,
} from '../ui';
import { ExerciseEditor } from '../components/ExerciseEditor';
import { ExerciseManagementItem } from '../components/ExerciseManagementItem';
import { numeric } from '../workout';
import type { Exercise, ThemeMode } from '../types';

export default function SettingsScreen() {
  const { state, update } = useApp();
  const { styles } = useTheme();
  const [page, setPage] = useState<'menu' | 'basic' | 'exercises'>('menu');
  const [weight, setWeight] = useState(String(state.weightStepKg));
  const [rest, setRest] = useState(String(state.restDurationSeconds / 60));
  const [editor, setEditor] = useState<Exercise | 'new'>();
  const back = () => (page === 'menu' ? router.back() : setPage('menu'));
  useFocusEffect(
    React.useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (page === 'menu') return false;
        setPage('menu');
        return true;
      });
      return () => sub.remove();
    }, [page]),
  );
  const step = numeric(weight);
  const seconds = numeric(rest);
  return (
    <Screen
      title={
        page === 'menu' ? '設定' : page === 'basic' ? '基本設定' : '種目管理'
      }
      onBack={back}
    >
      {page === 'menu' && (
        <>
          <Button
            label="基本設定　›"
            secondary
            onPress={() => setPage('basic')}
          />
          <Button
            label="種目管理　›"
            secondary
            onPress={() => setPage('exercises')}
          />
          <Text style={[styles.small, { marginTop: 20 }]}>
            記録は端末内に保存します。ルームへ投稿した記録だけがメンバーに共有されます。
          </Text>
        </>
      )}
      {page === 'basic' && (
        <>
          <SectionTitle>外観</SectionTitle>
          <Card>
            <Text style={styles.body}>テーマ</Text>
            <View style={[styles.wrap, { marginTop: 10 }]}>
              {(
                [
                  ['system', 'システム'],
                  ['light', 'ライト'],
                  ['dark', 'ダーク'],
                ] as [ThemeMode, string][]
              ).map(([value, label]) => (
                <Chip
                  key={value}
                  label={label}
                  active={state.themeMode === value}
                  onPress={() => update((s) => ({ ...s, themeMode: value }))}
                />
              ))}
            </View>
          </Card>
          <SectionTitle>カレンダー</SectionTitle>
          <Card>
            <Text style={styles.body}>週の始まり</Text>
            <View style={[styles.wrap, { marginTop: 10 }]}>
              <Chip
                label="日曜から"
                active={!state.weekStartsMonday}
                onPress={() =>
                  update((s) => ({ ...s, weekStartsMonday: false }))
                }
              />
              <Chip
                label="月曜から"
                active={state.weekStartsMonday}
                onPress={() =>
                  update((s) => ({ ...s, weekStartsMonday: true }))
                }
              />
            </View>
          </Card>
          <SectionTitle>トレーニング</SectionTitle>
          <Card>
            <Field
              label="基本の重量増減幅（kg）"
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
            />
            <Button
              label="重量設定を保存"
              disabled={step === undefined || step < 0.01 || step > 1000}
              onPress={() =>
                update((s) => ({
                  ...s,
                  weightStepKg: Math.round(step! * 100) / 100,
                }))
              }
            />
            <Field
              label="共通のセット間休憩（分・0で休憩なし）"
              value={rest}
              onChangeText={setRest}
              keyboardType="decimal-pad"
            />
            <Button
              label="休憩設定を保存"
              disabled={seconds === undefined || seconds > 120}
              onPress={() =>
                update((s) => ({
                  ...s,
                  restDurationSeconds: Math.round(seconds! * 60),
                }))
              }
            />
            <Text style={styles.small}>
              種目ごとの設定がある場合は、その値を使います。
            </Text>
          </Card>
        </>
      )}
      {page === 'exercises' && (
        <>
          <Button label="＋ 種目を追加" onPress={() => setEditor('new')} />
          {state.exercises
            .filter((e) => !e.archived)
            .map((exercise) => (
              <ExerciseManagementItem
                key={exercise.id}
                name={exercise.name}
                onEdit={() => setEditor(exercise)}
                onDelete={() =>
                  update((s) => ({
                    ...s,
                    exercises: s.exercises.map((e) =>
                      e.id === exercise.id ? { ...e, archived: true } : e,
                    ),
                  }))
                }
              />
            ))}
        </>
      )}
      {editor && (
        <ExerciseEditor
          exercise={editor === 'new' ? undefined : editor}
          onClose={() => setEditor(undefined)}
        />
      )}
    </Screen>
  );
}
