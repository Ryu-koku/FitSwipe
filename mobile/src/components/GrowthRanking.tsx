import React from 'react';
import { Text, View } from 'react-native';
import { useApp } from '../context';
import { strengthGrowth } from '../logic';
import { Card, SectionTitle, useTheme } from '../ui';

export function GrowthRanking() {
  const { state } = useApp();
  const { colors, styles } = useTheme();
  const ranking = state.exercises.filter((exercise) => !exercise.archived).flatMap((exercise) => {
    const points = strengthGrowth(state, exercise.id, 0);
    if (points.length < 2 || points[0].value <= 0) return [];
    const change = (points[points.length - 1].value - points[0].value) / points[0].value * 100;
    return [{ name: exercise.name, change, count: points.length }];
  }).sort((a, b) => b.change - a.change).slice(0, 5);

  return <>
    <SectionTitle>成長ランキング</SectionTitle>
    <Card style={{ padding: 12, marginBottom: 0 }}>
      <Text style={styles.small}>直近90日の推定1RM変化率・記録2日以上</Text>
      {!ranking.length ? <Text style={[styles.small, { marginTop: 12 }]}>重量と回数を記録すると、成長ランキングが表示されます。</Text> : ranking.map((item, index) => (
        <View key={item.name} style={[styles.row, { paddingVertical: 8, borderBottomWidth: index === ranking.length - 1 ? 0 : 1, borderColor: colors.line }]}>
          <Text style={[styles.body, { width: 32, fontWeight: '700', color: colors.primary }]}>{index + 1}位</Text>
          <Text numberOfLines={1} style={[styles.body, { flex: 1, fontWeight: '700' }]}>{item.name}</Text>
          <Text style={[styles.body, { color: item.change >= 0 ? colors.primary : colors.muted, fontWeight: '700' }]}>{item.change > 0 ? '+' : ''}{item.change.toFixed(1)}%</Text>
        </View>
      ))}
    </Card>
  </>;
}
