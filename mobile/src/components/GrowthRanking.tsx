import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { useApp } from '../context';
import { strengthGrowth } from '../logic';
import { Card, SectionTitle, Sheet, useTheme } from '../ui';

const mockRanking = [
  { name: 'スクワット', change: 18.6 },
  { name: 'ベンチプレス', change: 12.4 },
  { name: 'デッドリフト', change: 7.8 },
  { name: 'ショルダープレス', change: 0 },
  { name: 'ダンベルカール', change: -3.2 },
];

export function GrowthRanking() {
  const [preview, setPreview] = useState(__DEV__);
  const [selected, setSelected] = useState<string>();
  const { state } = useApp();
  const { colors, styles } = useTheme();
  const ranking = state.exercises.filter((exercise) => !exercise.archived).flatMap((exercise) => {
    const points = strengthGrowth(state, exercise.id, 0);
    if (points.length < 2 || points[0].value <= 0) return [];
    const change = (points[points.length - 1].value - points[0].value) / points[0].value * 100;
    return [{ name: exercise.name, change, points }];
  }).sort((a, b) => b.change - a.change).slice(0, 5);
  const showingMock = __DEV__ && preview;
  const displayedRanking = showingMock ? mockRanking.map((item, index) => ({ ...item,
    points: [0, 0.2, 0.15, 0.55, 0.7, 1].map((factor, point) => {
      const date = new Date();
      date.setDate(date.getDate() - (5 - point) * 14);
      return { date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`, value: (100 - index * 12) * (1 + item.change / 100 * factor) };
    }),
  })) : ranking;
  const detail = displayedRanking.find((item) => item.name === selected);

  return <>
    <SectionTitle>成長ランキング</SectionTitle>
    <Card style={{ padding: 12, marginBottom: 0 }}>
      {!displayedRanking.length ? <Text style={[styles.small, { marginTop: 12 }]}>重量と回数を記録すると、成長ランキングが表示されます。</Text> : displayedRanking.map((item, index) => (
        <Pressable key={item.name} accessibilityRole="button" accessibilityLabel={`${item.name}の成長グラフを見る`} onPress={() => setSelected(item.name)} style={[styles.row, { paddingVertical: 8, borderBottomWidth: index === displayedRanking.length - 1 ? 0 : 1, borderColor: colors.line }]}>
          <Text style={[styles.body, { width: 32, fontWeight: '700', color: colors.primary }]}>{index + 1}位</Text>
          <Text numberOfLines={1} style={[styles.body, { flex: 1, fontWeight: '700' }]}>{item.name}</Text>
          <Text style={[styles.body, { color: item.change >= 0 ? colors.primary : colors.muted, fontWeight: '700' }]}>{item.change > 0 ? '+' : ''}{item.change.toFixed(1)}%</Text>
        </Pressable>
      ))}
      <Text style={[styles.small, { marginTop: 12 }]}>直近90日の推定1RM変化率 · 記録2日以上の種目が対象</Text>
      {__DEV__ && <Pressable accessibilityRole="button" onPress={() => setPreview((value) => !value)} style={{ paddingVertical: 10 }}>
        <Text style={[styles.small, { color: colors.primary }]}>{showingMock ? 'モック表示中 · 実データに切り替え' : 'モックで表示を確認'}</Text>
      </Pressable>}
    </Card>
    {detail && <Sheet title={detail.name} onClose={() => setSelected(undefined)} popup>
      <Text style={styles.small}>推定1RM（kg） · 直近90日{showingMock ? ' · モック' : ''}</Text>
      <GrowthLine points={detail.points} />
      <Text style={[styles.small, { marginBottom: 12 }]}>同日の最大値を表示。実際の最大重量ではなく、重量と回数からの推定値です。</Text>
    </Sheet>}
  </>;
}

function GrowthLine({ points }: { points: { date: string; value: number }[] }) {
  const { colors, styles } = useTheme();
  const values = points.map((point) => point.value);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const padding = Math.max((high - low) * 0.2, high * 0.02, 1);
  const desiredStep = Math.max(1, (high - low + padding * 2) / 4);
  const magnitude = Math.pow(10, Math.floor(Math.log10(desiredStep)));
  const step = [1, 2, 5, 10].map((value) => value * magnitude).find((value) => value >= desiredStep)!;
  const minimum = Math.max(0, Math.floor((low - padding) / step) * step);
  const maximum = Math.max(minimum + step, Math.ceil((high + padding) / step) * step);
  const tickCount = Math.round((maximum - minimum) / step);
  const first = new Date(`${points[0].date}T12:00:00`).getTime();
  const span = Math.max(1, new Date(`${points[points.length - 1].date}T12:00:00`).getTime() - first);
  const positions = points.map((point) => ({
    x: 52 + (new Date(`${point.date}T12:00:00`).getTime() - first) / span * 282,
    y: 180 - (point.value - minimum) / (maximum - minimum) * 156,
  }));
  return <View style={{ marginVertical: 16 }}>
    <Text style={[styles.body, { color: colors.primary, fontWeight: '700' }]}>{points[points.length - 1].value.toFixed(1)} kg</Text>
    <View accessible accessibilityLabel={points.map((point) => `${point.date}：${point.value.toFixed(1)}kg`).join('、')}>
      <Svg width="100%" height={240} viewBox="0 0 360 220">
        <SvgText x={8} y={12} fill={colors.muted} fontSize={11}>kg</SvgText>
        {Array.from({ length: tickCount + 1 }, (_, tick) => {
          const y = 180 - tick / tickCount * 156;
          const value = minimum + step * tick;
          return <React.Fragment key={tick}>
            <Line x1={52} x2={334} y1={y} y2={y} stroke={colors.line} />
            <SvgText x={44} y={y + 4} textAnchor="end" fill={colors.muted} fontSize={11}>{value.toFixed(0)}</SvgText>
          </React.Fragment>;
        })}
        <Line x1={52} x2={52} y1={24} y2={180} stroke={colors.muted} />
        <Line x1={52} x2={334} y1={180} y2={180} stroke={colors.muted} />
        {[0, 0.5, 1].map((fraction) => {
          const date = new Date(first + span * fraction);
          const x = 52 + 282 * fraction;
          return <React.Fragment key={fraction}>
            <Line x1={x} x2={x} y1={180} y2={185} stroke={colors.muted} />
            <SvgText x={x} y={201} textAnchor={fraction === 0 ? 'start' : fraction === 1 ? 'end' : 'middle'} fill={colors.muted} fontSize={11}>{date.getMonth() + 1}/{date.getDate()}</SvgText>
          </React.Fragment>;
        })}
        <Polyline points={positions.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke={colors.primary} strokeWidth={2.5} />
        {positions.map((point, index) => <Circle key={points[index].date} cx={point.x} cy={point.y} r={3} fill={colors.primary} />)}
      </Svg>
    </View>
    <Text style={styles.small}>変化が見やすいよう、縦軸の範囲を調整しています。</Text>
  </View>;
}
