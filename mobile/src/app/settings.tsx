import React, { useState } from 'react';
import { BackHandler, Share, Text, View } from 'react-native';
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
import { AccountPanel } from '../components/AccountPanel';
import { lastExerciseTrainingDays } from '../logic';
import * as Health from '@appeeky/expo-healthkit';

export default function SettingsScreen() {
  const { state, update } = useApp();
  const { styles } = useTheme();
  const [page, setPage] = useState<'menu' | 'basic' | 'exercises' | 'body'>('menu');
  const [weight, setWeight] = useState(String(state.weightStepKg));
  const [editor, setEditor] = useState<Exercise | 'new'>();
  const [importText, setImportText] = useState('');
  const [csvText, setCsvText] = useState('');
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
  return (
    <Screen
      title={
        page === 'menu' ? '設定' : page === 'basic' ? '基本設定' : page === 'body' ? '体組成' : '種目管理'
      }
      onBack={back}
    >
      {page === 'menu' && (
        <>
          <AccountPanel />
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
          <Button label="体重・体脂肪率　›" secondary onPress={() => setPage('body')} />
          <Button label="データを書き出す（JSON）" secondary onPress={() => void Share.share({ message: JSON.stringify(state, null, 2), title: 'FitSwipeバックアップ' })} />
          <Button label="トレーニングCSVを書き出す" secondary onPress={() => { const header = 'date,exercise,bodyPart,weightKg,reps,setOrder'; const rows = state.sets.filter(s => s.isCompleted).map(s => { const session = state.sessions.find(x => x.id === s.sessionId); const exercise = state.exercises.find(x => x.id === s.exerciseId); const weight = s.normalWeightKg ?? s.leftWeightKg ?? 0; const reps = s.normalReps ?? s.leftReps ?? 0; return [session?.startedAt.slice(0,10), `"${(exercise?.name ?? '').replaceAll('"','""')}"`, `"${(exercise?.muscleGroup ?? '').replaceAll('"','""')}"`, weight, reps, s.setOrder].join(','); }); void Share.share({ title: 'FitSwipe CSV', message: [header, ...rows].join('\n') }); }} />
          <Field label="JSONバックアップを貼り付けて復元" value={importText} onChangeText={setImportText} />
          <Button label="JSONを検証して復元" secondary disabled={!importText.trim()} onPress={() => { try { const parsed = JSON.parse(importText); if (!Array.isArray(parsed.exercises) || !Array.isArray(parsed.sessions) || !Array.isArray(parsed.sets)) throw new Error(); update(() => parsed); setImportText(''); } catch { alert('FitSwipeの完全なJSONバックアップを貼り付けてください'); } }} />
          <Field label="CSVを貼り付けて記録を取り込む（date,exercise,weightKg,reps）" value={csvText} onChangeText={setCsvText} />
          <Button label="CSV記録を取り込む" secondary disabled={!csvText.trim()} onPress={() => { try { const lines = csvText.trim().split(/\r?\n/); if (lines.length < 2 || !lines[0].toLowerCase().includes('date') || !lines[0].toLowerCase().includes('exercise')) throw new Error(); const header = lines.shift()!.split(',').map(x => x.trim()); const idx = (name: string) => header.indexOf(name); const imported = lines.map(line => line.split(',').map(x => x.trim().replace(/^"|"$/g, ''))).filter(row => row.length >= 4).map(row => { const date = row[idx('date')] ?? row[0]; const name = row[idx('exercise')] ?? row[1]; const weight = Number(row[idx('weightKg')] ?? row[2]); const reps = Number(row[idx('reps')] ?? row[3]); if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !name || !Number.isFinite(weight) || weight < 0 || !Number.isInteger(reps) || reps < 1) throw new Error(); return { date, name, weight, reps }; }); if (!imported.length) throw new Error(); update(s => { let nextId = s.nextId; const exercises = [...s.exercises]; const sessions = [...s.sessions]; const sets = [...s.sets]; const byDate = new Map(sessions.filter(x => x.status === 'COMPLETED').map(x => [x.startedAt.slice(0,10), x])); for (const item of imported) { let exercise = exercises.find(x => x.name.toLowerCase() === item.name.toLowerCase()); if (!exercise) { exercise = { id: nextId++, name: item.name, mode: 'NORMAL', sortOrder: exercises.length, archived: false, muscleGroup: '未分類' }; exercises.push(exercise); } let session = byDate.get(item.date); if (!session) { session = { id: nextId++, startedAt: `${item.date}T12:00:00.000Z`, endedAt: `${item.date}T12:00:00.000Z`, status: 'COMPLETED' }; sessions.push(session); byDate.set(item.date, session); } sets.push({ id: nextId++, sessionId: session.id, exerciseId: exercise.id, setOrder: sets.filter(x => x.sessionId === session!.id && x.exerciseId === exercise!.id).length, normalWeightKg: item.weight, normalReps: item.reps, leftCompleted: false, rightCompleted: false, isCompleted: true }); } return { ...s, nextId, exercises, sessions, sets }; }); setCsvText(''); alert(`${imported.length}件のセット記録を取り込みました`); } catch { alert('CSV形式を確認してください。ヘッダーはdate,exercise,weightKg,repsです'); } }} />
          <Text style={[styles.small, { marginTop: 20 }]}>
            ログインすると個人記録もアカウントに保存します。ルームごとに同意すると、完了記録の種目・重量・回数・日時がメンバーへ自動共有されます。共有停止はルームのメニューから行えます。
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
                name={`${exercise.name} · ${exercise.muscleGroup ?? '未分類'} · ${lastExerciseTrainingDays(state, exercise.id) === undefined ? '未実施' : `${lastExerciseTrainingDays(state, exercise.id)}日前`}`}
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
      {page === 'body' && <BodyMeasurements />}
      {editor && (
        <ExerciseEditor
          exercise={editor === 'new' ? undefined : editor}
          onClose={() => setEditor(undefined)}
        />
      )}
    </Screen>
  );
}

function BodyMeasurements() {
  const { state, update } = useApp();
  const { styles } = useTheme();
  const [weight, setWeight] = useState('');
  const [fat, setFat] = useState('');
  const [height, setHeight] = useState(String(state.heightCm ?? ''));
  const w = numeric(weight), f = numeric(fat), h = numeric(height);
  return <>
    <Card>
      <Field label="体重（kg）" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
      <Field label="体脂肪率（%・任意）" value={fat} onChangeText={setFat} keyboardType="decimal-pad" />
      <Field label="身長（cm）" value={height} onChangeText={setHeight} keyboardType="decimal-pad" />
      <Text style={styles.body}>{w && h && h > 0 ? `BMI ${((w / ((h / 100) ** 2))).toFixed(1)}` : '体重と身長を入力するとBMIを表示'}</Text>
      <Button label="今日の測定を保存" disabled={!w || w <= 0 || (f !== undefined && (f < 0 || f > 100)) || (h !== undefined && (h < 50 || h > 260))} onPress={() => { update(s => ({ ...s, heightCm: h ?? s.heightCm, bodyMeasurements: [...(s.bodyMeasurements ?? []), { id: `${Date.now()}`, measuredAt: new Date().toISOString(), weightKg: w, bodyFatPercent: f, heightCm: h ?? s.heightCm }].slice(-1000) })); setWeight(''); setFat(''); }} />
      <Button label="Appleヘルス／Health Connectから読み込む" secondary onPress={() => void (async () => { try { if (!Health.isAvailable()) throw new Error('この端末ではヘルスケア連携を利用できません'); const types = [Health.QuantityType.bodyMass, Health.QuantityType.bodyFatPercentage, Health.QuantityType.height]; await Health.requestAuthorization({ toRead: types }); const from = new Date(0); const [weights, fats, heights] = await Promise.all([Health.queryQuantitySamples({ type: Health.QuantityType.bodyMass, unit: Health.Unit.kilogram, from, limit: 500 }), Health.queryQuantitySamples({ type: Health.QuantityType.bodyFatPercentage, unit: Health.Unit.percent, from, limit: 500 }), Health.queryQuantitySamples({ type: Health.QuantityType.height, unit: Health.Unit.centimeter, from, limit: 1 })]); update(s => { const next = [...(s.bodyMeasurements ?? [])]; const days = new Set(next.map(x => x.measuredAt.slice(0,10))); for (const sample of weights) { const day = sample.startDate.toISOString().slice(0,10); if (days.has(day)) continue; const fat = fats.find(x => x.startDate.toISOString().slice(0,10) === day); next.push({ id: `health-${sample.uuid}`, measuredAt: sample.startDate.toISOString(), weightKg: sample.value, bodyFatPercent: fat ? fat.value : undefined, heightCm: heights.at(-1)?.value ? heights.at(-1)!.value * 100 : s.heightCm }); } return { ...s, heightCm: heights.at(-1)?.value ? heights.at(-1)!.value * 100 : s.heightCm, bodyMeasurements: next.sort((a,b) => a.measuredAt.localeCompare(b.measuredAt)).slice(-1000) }; }); alert(`${weights.length}件の体重データを確認しました`); } catch (e) { alert(e instanceof Error ? e.message : 'ヘルスケアデータを読み込めませんでした'); } })()} />
    </Card>
    <SectionTitle>測定履歴</SectionTitle>
    {state.bodyMeasurements?.length ? <Card><Text style={styles.body}>体重の推移（直近12回）</Text><View style={{ height: 130, flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 12 }}>{state.bodyMeasurements.slice(-12).map(item => { const values = state.bodyMeasurements!.slice(-12).map(x => x.weightKg ?? 0); const lo = Math.min(...values), hi = Math.max(...values); const barHeight = hi === lo ? 55 : 24 + ((item.weightKg! - lo) / (hi - lo)) * 85; return <View key={item.id} style={{ flex: 1, alignItems: 'center' }}><View style={{ height: barHeight, width: '80%', backgroundColor: styles.metric.color as string, borderRadius: 5 }} /><Text style={styles.small}>{new Date(item.measuredAt).toLocaleDateString().slice(5)}</Text></View>; })}</View></Card> : null}
    {[...(state.bodyMeasurements ?? [])].reverse().map(item => <Card key={item.id}><Text style={styles.body}>{new Date(item.measuredAt).toLocaleDateString()}　{item.weightKg} kg{item.bodyFatPercent !== undefined ? `　${item.bodyFatPercent}%` : ''}</Text></Card>)}
  </>;
}
