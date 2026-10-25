import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../context';
import { formatWeight, previousSet } from '../logic';
import { Button, Card, Field, Screen, SectionTitle, styles } from '../ui';

export default function WorkoutScreen() {
  const { state, update, finishWorkout } = useApp();
  const session = state.sessions.find((item) => item.status === 'IN_PROGRESS');
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [rest, setRest] = useState(0);
  const sessionSets = session ? state.sets.filter((set) => set.sessionId === session.id) : [];
  const exerciseIds = [...new Set(sessionSets.map((set) => set.exerciseId))];
  const exerciseId = exerciseIds[exerciseIndex];
  const exercise = state.exercises.find((item) => item.id === exerciseId);
  const sets = sessionSets.filter((set) => set.exerciseId === exerciseId).sort((a, b) => a.setOrder - b.setOrder);
  useEffect(() => { if (rest <= 0) return; const timer = setInterval(() => setRest((value) => value - 1), 1000); return () => clearInterval(timer); }, [rest]);
  if (!session || !exercise) return <Screen title="ワークアウト"><Card><Text style={styles.body}>進行中のワークアウトがありません。</Text><Button label="準備画面へ" onPress={() => router.replace('/prepare')} /></Card></Screen>;
  const completeSet = (setId: number) => {
    update((current) => ({ ...current, sets: current.sets.map((set) => set.id === setId ? { ...set, isCompleted: true, leftCompleted: true, rightCompleted: true } : set) }));
    setRest(state.restDurationSeconds);
  };
  const updateSet = (setId: number, field: string, raw: string) => {
    const value = raw.trim() === '' ? undefined : Number(raw);
    update((current) => ({ ...current, sets: current.sets.map((set) => set.id === setId ? { ...set, [field]: Number.isFinite(value) ? value : undefined } : set) }));
  };
  return <Screen title="ワークアウト" right={<Text style={styles.small}>{new Date(session.startedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}開始</Text>}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{exerciseIds.map((id, index) => <Text key={id} onPress={() => setExerciseIndex(index)} style={[styles.tab, { marginRight: 16 }, index === exerciseIndex && { color: '#17212b', textDecorationLine: 'underline' }]}>{state.exercises.find((item) => item.id === id)?.name}</Text>)}</View>
    <Card><View style={styles.row}><View><Text style={styles.metric}>{exercise.name}</Text><Text style={styles.small}>{exercise.mode === 'BILATERAL' ? '左右別に記録' : '通常記録'}</Text></View>{rest > 0 && <Text style={{ color: '#d97706', fontWeight: '800' }}>休憩 {Math.floor(rest / 60)}:{String(rest % 60).padStart(2, '0')}</Text>}</View></Card>
    {sets.map((set) => <SetRow key={set.id} set={set} bilateral={exercise.mode === 'BILATERAL'} onChange={updateSet} onComplete={() => completeSet(set.id)} previous={previousSet(state, exercise.id, session.id)} />)}
    <Button label="セットを追加" secondary onPress={() => update((current) => ({ ...current, nextId: current.nextId + 1, sets: [...current.sets, { id: current.nextId, sessionId: session.id, exerciseId: exercise.id, setOrder: sets.length + 1, normalWeightKg: sets[sets.length - 1]?.normalWeightKg, normalReps: sets[sets.length - 1]?.normalReps, leftWeightKg: sets[sets.length - 1]?.leftWeightKg, leftReps: sets[sets.length - 1]?.leftReps, rightWeightKg: sets[sets.length - 1]?.rightWeightKg, rightReps: sets[sets.length - 1]?.rightReps, leftCompleted: false, rightCompleted: false, isCompleted: false }] }))} />
    <SectionTitle>進捗</SectionTitle><Text style={styles.body}>{sessionSets.filter((set) => set.isCompleted).length} / {sessionSets.length} セット完了</Text>
    <Button label="ワークアウトを完了" onPress={() => { finishWorkout(session.id); router.replace({ pathname: '/complete', params: { sessionId: String(session.id) } }); }} />
    <Button label="中断せずに戻る" secondary onPress={() => router.back()} />
  </Screen>;
}

function SetRow({ set, bilateral, onChange, onComplete, previous }: { set: any; bilateral: boolean; onChange: (id: number, field: string, value: string) => void; onComplete: () => void; previous?: any }) {
  return <Card style={{ borderColor: set.isCompleted ? '#bfe7d4' : '#e2e8ef' }}><View style={styles.row}><Text style={styles.metric}>セット {set.setOrder}</Text><Text style={set.isCompleted ? { color: '#138a5b', fontWeight: '800' } : styles.muted}>{set.isCompleted ? '完了' : '未完了'}</Text></View>
    {bilateral ? <View><Text style={styles.small}>左</Text><View style={{ flexDirection: 'row', gap: 8 }}><Field value={String(set.leftWeightKg ?? '')} onChangeText={(v) => onChange(set.id, 'leftWeightKg', v)} placeholder={previous ? String(previous.leftWeightKg ?? '') : '重量'} keyboardType="numeric" /><Field value={String(set.leftReps ?? '')} onChangeText={(v) => onChange(set.id, 'leftReps', v)} placeholder="回数" keyboardType="numeric" /></View><Text style={styles.small}>右</Text><View style={{ flexDirection: 'row', gap: 8 }}><Field value={String(set.rightWeightKg ?? '')} onChangeText={(v) => onChange(set.id, 'rightWeightKg', v)} placeholder={previous ? String(previous.rightWeightKg ?? '') : '重量'} keyboardType="numeric" /><Field value={String(set.rightReps ?? '')} onChangeText={(v) => onChange(set.id, 'rightReps', v)} placeholder="回数" keyboardType="numeric" /></View></View> : <View style={{ flexDirection: 'row', gap: 8 }}><Field value={String(set.normalWeightKg ?? '')} onChangeText={(v) => onChange(set.id, 'normalWeightKg', v)} placeholder={previous ? String(previous.normalWeightKg ?? '') : '重量 kg'} keyboardType="numeric" /><Field value={String(set.normalReps ?? '')} onChangeText={(v) => onChange(set.id, 'normalReps', v)} placeholder="回数" keyboardType="numeric" /></View>}
    <Button label={set.isCompleted ? '完了済み' : 'このセットを完了'} disabled={set.isCompleted} onPress={onComplete} />
  </Card>;
}
