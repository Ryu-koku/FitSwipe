import { LegalLinks } from '../components/LegalLinks';
import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, Text, View } from 'react-native';
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
import { BeginnerGuide } from '../components/BeginnerGuide';
import { ProfileEditor } from '../components/ProfileEditor';
import { lastExerciseTrainingDays } from '../logic';
import * as Health from '@appeeky/expo-healthkit';
import { randomUUID } from 'expo-crypto';
import { exportBackup, restoreBackup } from '../backup';
import { exportWorkoutCsv, importWorkoutCsv } from '../csv';
import { importBodyMeasurements } from '../body-measurements';
import { pickTextFile, shareTextFile } from '../data-transfer';

export default function SettingsScreen() {
  const { state, update, importData } = useApp();
  const { styles } = useTheme();
  const [page, setPage] = useState<'menu' | 'basic' | 'exercises' | 'body'>('menu');
  const [weight, setWeight] = useState(String(state.weightStepKg));
  const [editor, setEditor] = useState<Exercise | 'new'>();
  const [transferBusy, setTransferBusy] = useState(false);
  const [transferError, setTransferError] = useState<string>();
  const transfer = async (work: () => Promise<unknown>) => {
    if (transferBusy) return;
    setTransferBusy(true); setTransferError(undefined);
    try { await work(); }
    catch (error) { setTransferError(error instanceof Error ? error.message : '保存・読み込みに失敗しました。'); }
    finally { setTransferBusy(false); }
  };
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
          <ProfileEditor />
          <BeginnerGuide />
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
          <Button label="データを書き出す（JSON）" secondary disabled={transferBusy} onPress={() => void transfer(() => shareTextFile('fitswipe-backup', 'json', exportBackup(state)))} />
          <Text style={styles.small}>記録・種目・プリセット・体組成・設定をファイルに書き出します。ログイン情報とルーム情報は含めません。</Text>
          <Button label="トレーニングCSVを書き出す" secondary disabled={transferBusy} onPress={() => void transfer(() => shareTextFile('fitswipe-workouts', 'csv', exportWorkoutCsv(state)))} />
          <Text style={styles.small}>完了したトレーニングの実施セットを出力します。左右別の重量・回数も含みます。</Text>
          <Button label="JSONバックアップから追加復元" secondary disabled={transferBusy} onPress={() => void transfer(async () => {
            const text = await pickTextFile();
            if (text !== undefined) await importData(s => restoreBackup(s, text, randomUUID));
          })} />
          <Text style={styles.small}>現在の記録を残して追加します。設定はバックアップ側を採用します。ログイン中は現在のアカウントに同期されます。同じバックアップを繰り返し復元すると記録が重複します。</Text>
          <Button label="CSVファイルから記録を取り込む" secondary disabled={transferBusy} onPress={() => void transfer(async () => {
            const text = await pickTextFile();
            if (text !== undefined) await importData(s => importWorkoutCsv(s, text));
          })} />
          <Text style={styles.small}>列は date,exercise,weightKg,reps が必須です。</Text>
          {transferError && <Text accessibilityRole="alert" style={styles.small}>{transferError}</Text>}
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
  const { state, update, captureImport } = useApp();
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
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
      <Button label="今日の測定を保存" disabled={!w || w <= 0 || (f !== undefined && (f < 0 || f > 100)) || (h !== undefined && (h < 50 || h > 260))} onPress={() => { update(s => ({ ...s, heightCm: h ?? s.heightCm, bodyMeasurements: [...(s.bodyMeasurements ?? []), { id: randomUUID(), measuredAt: new Date().toISOString(), weightKg: w, bodyFatPercent: f, heightCm: h ?? s.heightCm }].slice(-1000) })); setWeight(''); setFat(''); }} />
      <Text style={styles.small}>ヘルスケアから体重・体脂肪率・身長を読み取り、測定履歴と推移の表示に使います。書き込みは行いません。読み込んだ測定値と取得元IDは端末に保存され、Googleログイン中はFitSwipeのサーバーへ個人同期されます。ルームへは共有しません。許可しなくても手入力できます。OSの設定から許可を取り消せます。</Text>
      <LegalLinks />
      <Button label="Appleヘルス／Health Connectから読み込む" secondary onPress={() => void (async () => { try { const commit = captureImport(); if (!Health.isAvailable()) throw new Error('この端末ではヘルスケア連携を利用できません'); const types = [Health.QuantityType.bodyMass, Health.QuantityType.bodyFatPercentage, Health.QuantityType.height]; const authorized = await Health.requestAuthorization({ toRead: types }); if (!authorized) throw new Error('読み取りが許可されていません。体重・体脂肪率・身長の読み取りを許可するか、手入力で利用してください。'); const from = Platform.OS === 'android' ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) : new Date(0); const [weights, fats, heights] = await Promise.all([Health.queryQuantitySamples({ type: Health.QuantityType.bodyMass, unit: Health.Unit.kilogram, from, limit: 500 }), Health.queryQuantitySamples({ type: Health.QuantityType.bodyFatPercentage, unit: Health.Unit.percent, from, limit: 500 }), Health.queryQuantitySamples({ type: Health.QuantityType.height, unit: Health.Unit.centimeter, from, limit: 1 })]); if (!mounted.current) return; await commit(s => importBodyMeasurements(s, weights, fats, heights)); alert(`${weights.length}件の体重データを確認しました`); } catch (e) { if (!mounted.current) return; alert('ヘルスケアデータを読み込めませんでした。体重・体脂肪率・身長の読み取り許可を確認してください。許可しなくても手入力できます。'); } })()} />
    </Card>
    <SectionTitle>測定履歴</SectionTitle>
    {state.bodyMeasurements?.length ? <Card><Text style={styles.body}>体重の推移（直近12回）</Text><View style={{ height: 130, flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 12 }}>{state.bodyMeasurements.slice(-12).map(item => { const values = state.bodyMeasurements!.slice(-12).map(x => x.weightKg ?? 0); const lo = Math.min(...values), hi = Math.max(...values); const barHeight = hi === lo ? 55 : 24 + ((item.weightKg! - lo) / (hi - lo)) * 85; return <View key={item.id} style={{ flex: 1, alignItems: 'center' }}><View style={{ height: barHeight, width: '80%', backgroundColor: styles.metric.color as string, borderRadius: 5 }} /><Text style={styles.small}>{new Date(item.measuredAt).toLocaleDateString().slice(5)}</Text></View>; })}</View></Card> : null}
    {[...(state.bodyMeasurements ?? [])].reverse().map(item => <Card key={item.id}><Text style={styles.body}>{new Date(item.measuredAt).toLocaleDateString()}　{item.weightKg} kg{item.bodyFatPercent !== undefined ? `　${item.bodyFatPercent}%` : ''}</Text></Card>)}
  </>;
}
