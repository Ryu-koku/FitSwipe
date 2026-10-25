import React from 'react';
import { Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../context';
import { Button, Card, Chip, Field, Screen, SectionTitle, styles } from '../ui';

export default function SettingsScreen() {
  const { state, update } = useApp();
  const [weight, setWeight] = React.useState(String(state.weightStepKg)); const [rest, setRest] = React.useState(String(state.restDurationSeconds));
  return <Screen title="設定"><SectionTitle>表示</SectionTitle><Card><Text style={styles.body}>テーマ</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>{[['system', 'システム'], ['light', 'ライト'], ['dark', 'ダーク']].map(([value, label]) => <Chip key={value} label={label} active={state.themeMode === value} onPress={() => update((current) => ({ ...current, themeMode: value as 'system' | 'light' | 'dark' }))} />)}</View><View style={[styles.row, { marginTop: 12 }]}><Text style={styles.body}>週の開始を月曜にする</Text><Switch value={state.weekStartsMonday} onValueChange={(value) => update((current) => ({ ...current, weekStartsMonday: value }))} /></View></Card><SectionTitle>トレーニング</SectionTitle><Card><Text style={styles.body}>重量の増減単位 (kg)</Text><Field value={weight} onChangeText={setWeight} keyboardType="numeric" /><Text style={styles.body}>標準休憩時間 (秒)</Text><Field value={rest} onChangeText={setRest} keyboardType="numeric" /><Button label="設定を保存" onPress={() => update((current) => ({ ...current, weightStepKg: Math.max(0.01, Number(weight) || 1), restDurationSeconds: Math.max(0, Math.min(7200, Number(rest) || 0)) }))} /></Card><SectionTitle>種目管理</SectionTitle><Card>{state.exercises.map((exercise) => <View key={exercise.id} style={[styles.row, { marginBottom: 10 }]}><Text style={[styles.body, exercise.archived && styles.muted]}>{exercise.name}</Text><Switch value={!exercise.archived} onValueChange={(value) => update((current) => ({ ...current, exercises: current.exercises.map((item) => item.id === exercise.id ? { ...item, archived: !value } : item) }))} /></View>)}</Card><Button label="ホームへ" secondary onPress={() => router.back()} /></Screen>;
}
