import React from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../context';
import { activeExercises, selectedPreset } from '../logic';
import { Button, Card, Chip, Screen, SectionTitle, styles } from '../ui';

export default function PrepareScreen() {
  const { state, update, startWorkout } = useApp();
  const selected = selectedPreset(state);
  return <Screen title="準備">
    <Text style={styles.body}>プリセットを選択して、いつものメニューをすぐに開始できます。</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 14 }}>{state.presets.map((preset) => <Chip key={preset.id} label={preset.name} active={preset.id === selected?.id} onPress={() => update((current) => ({ ...current, selectedPresetId: preset.id }))} />)}</View>
    {selected && <Card><Text style={styles.metric}>{selected.name}</Text><Text style={styles.small}>{selected.exercises.length}種目</Text>{selected.exercises.map((config) => { const exercise = state.exercises.find((e) => e.id === config.exerciseId); return <View key={config.exerciseId} style={[styles.row, { marginTop: 12 }]}><Text style={styles.body}>{exercise?.name}</Text><Text style={styles.muted}>{config.sets}セット × {config.reps ?? 0}回</Text></View>; })}<Button label="このメニューで開始" onPress={() => { startWorkout(selected.id); router.replace('/workout'); }} /></Card>}
    <SectionTitle>プリセットを編集</SectionTitle>
    {state.presets.map((preset) => <Card key={preset.id}><View style={styles.row}><View><Text style={styles.body}>{preset.name}</Text><Text style={styles.small}>{preset.exercises.map((c) => state.exercises.find((e) => e.id === c.exerciseId)?.name).filter(Boolean).join('・')}</Text></View><Text style={styles.tab} onPress={() => update((current) => ({ ...current, selectedPresetId: preset.id }))}>選択</Text></View></Card>)}
    <SectionTitle>種目一覧</SectionTitle>
    <Card>{activeExercises(state).map((exercise) => <Text key={exercise.id} style={[styles.body, { marginBottom: 8 }]}>{exercise.mode === 'BILATERAL' ? '左右' : '通常'}　{exercise.name}</Text>)}</Card>
    <Button label="ホームに戻る" secondary onPress={() => router.back()} />
  </Screen>;
}
