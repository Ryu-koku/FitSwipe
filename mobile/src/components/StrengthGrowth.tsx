import React, { useState } from 'react';
import { Text, View, TextInput } from 'react-native';
import { useApp } from '../context';
import { estimatedOneRepMax, formatWeight, strengthGrowth } from '../logic';
import { Card, Chip, SectionTitle, Sheet, Button, useTheme } from '../ui';
import { router } from 'expo-router';

export function StrengthGrowth({ compact = false, height = 180 }: { compact?: boolean; height?: number }) {
  const { state, update } = useApp();
  const { colors, styles } = useTheme();
  const [choosing, setChoosing] = useState(false);
  const [side, setSide] = useState(1);
  const [width, setWidth] = useState(1);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const estimate = estimatedOneRepMax(Number(weight), Number(reps));
  const exercises = state.exercises.filter((e) => !e.archived);
  const exercise = exercises.find((e) => e.id === state.homeGrowthExerciseId) ?? exercises[0];
  const bilateral = exercise?.mode === 'BILATERAL';
  const points = exercise ? strengthGrowth(state, exercise.id, bilateral ? side : 0) : [];
  const max = Math.max(1, ...points.map((p) => p.value));
  const timestamp = (date: string) => new Date(`${date}T12:00:00`).getTime();
  const first = points.length ? timestamp(points[0].date) : 0;
  const span = points.length > 1 ? timestamp(points[points.length - 1].date) - first : 1;
  const positions = points.map((p) => ({
    x: points.length === 1 ? width / 2 : 8 + ((timestamp(p.date) - first) / span) * Math.max(0, width - 16),
    y: height - 12 - (p.value / max) * Math.max(12, height - 24),
  }));
  return (
    <>
      {!compact && <SectionTitle>筋力の成長</SectionTitle>}
      {!compact && <Card><Text style={styles.body}>RM計算（推定1RM）</Text><View style={styles.row}><TextInput value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="重量 kg" style={{ flex: 1, color: colors.ink, borderWidth: 1, borderColor: colors.line, padding: 10, borderRadius: 10 }} /><TextInput value={reps} onChangeText={setReps} keyboardType="number-pad" placeholder="回数 1〜12" style={{ flex: 1, color: colors.ink, borderWidth: 1, borderColor: colors.line, padding: 10, borderRadius: 10 }} /></View><Text style={styles.metric}>{estimate === undefined ? '—' : `${estimate} kg`}</Text><Text style={styles.small}>Epley式による推定値です。実際の最大重量ではありません。</Text></Card>}
      <Card style={compact ? { padding: 12, marginBottom: 0 } : undefined}>
        {compact && <View style={styles.row}><Text style={[styles.body, { fontWeight: '700' }]}>筋力の成長</Text><Text accessibilityRole="button" onPress={() => router.push('/growth')} style={[styles.tab, { paddingVertical: 4 }]}>詳しく見る ›</Text></View>}
        <View style={styles.row}>
          <Text style={[styles.body, { flex: 1 }]}>{exercise?.name ?? '種目がありません'}</Text>
          {!compact && <Button label="種目を選ぶ" secondary onPress={() => setChoosing(true)} />}
        </View>
        <Text style={styles.small}>推定最大重量（kg）・直近90日</Text>
        {bilateral && !compact && <View style={styles.wrap}>
          <Chip label="左" active={side === 1} onPress={() => setSide(1)} />
          <Chip label="右" active={side === 2} onPress={() => setSide(2)} />
        </View>}
        {!points.length ? <Text style={[styles.small, { marginVertical: compact ? 8 : 16 }]}>重量あり・1〜10回の完了記録ができると、ここに成長を表示します。</Text> : <>
          <Text style={[styles.metric, { color: colors.primary }]}>{formatWeight(points[points.length - 1].value)}</Text>
          {!compact && <Text style={styles.small}>直近：{points[points.length - 1].date} ／ 縦軸 0〜{max.toFixed(1)} kg</Text>}
          <View accessible accessibilityLabel={points.map((p) => `${p.date}、${p.value.toFixed(1)}キログラム`).join('。')}
            onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height, marginTop: compact ? 2 : 12 }}>
            {[0, 1, 2, 3].map((i) => <View key={i} style={{ position: 'absolute', left: 0, right: 0, top: 12 + i * Math.max(12, height - 24) / 3, height: 1, backgroundColor: colors.line }} />)}
            {positions.slice(1).map((p, i) => {
              const previous = positions[i];
              const dx = p.x - previous.x, dy = p.y - previous.y;
              const length = Math.hypot(dx, dy);
              return <View key={`line-${i}`} style={{ position: 'absolute', left: (previous.x + p.x) / 2 - length / 2, top: (previous.y + p.y) / 2 - 1, width: length, height: 2, backgroundColor: colors.primary, transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }] }} />;
            })}
            {positions.map((p, i) => <View key={points[i].date} style={{ position: 'absolute', left: p.x - 4, top: p.y - 4, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} />)}
          </View>
          {!compact && <View style={styles.row}><Text style={styles.small}>{points[0].date}</Text><Text style={styles.small}>{points.length > 1 ? points[points.length - 1].date : '記録が増えると線で表示'}</Text></View>}
        </>}
        {!compact && <Text style={[styles.small, { marginTop: 12 }]}>1回だけ持ち上げられる最大重量の推定値。同日の最大値を表示します。実測値ではありません。</Text>}
      </Card>
      {choosing && <Sheet title="成長を見る種目" onClose={() => setChoosing(false)}>
        {exercises.map((e) => <Button key={e.id} label={e.name} secondary={e.id !== exercise?.id} onPress={() => {
          update((s) => ({ ...s, homeGrowthExerciseId: e.id }));
          setChoosing(false);
        }} />)}
        {!exercises.length && <Text style={styles.body}>まず種目を登録してください。</Text>}
      </Sheet>}
    </>
  );
}
