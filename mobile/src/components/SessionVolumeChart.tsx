import { useApp } from '../context';
import { formatWeight } from '../logic';
import React, { useEffect, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import { sessionVolumes } from '../session-volume';
import { Card, useTheme } from '../ui';
import { useMotionPreference } from '../use-reduced-motion';

type Row = ReturnType<typeof sessionVolumes>[number];

function VolumeRow({ row, max, index, ready, reduced }: { row: Row; max: number; index: number; ready: boolean; reduced: boolean | undefined }) {
  const { state } = useApp();
  const { colors, styles } = useTheme();
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!ready || reduced === undefined) return;
    if (reduced) { progress.setValue(1); return; }
    const animation = Animated.timing(progress, { toValue: 1, duration: 700, delay: index * 120, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [ready, reduced, index, progress]);
  const comparison = row.previous === null ? '初回' : row.percent === null ? `前回 ${formatWeight(0, state.weightUnit)}` : `${row.percent > 0 ? '+' : ''}${row.percent.toFixed(1)}%`;
  return <View style={{ marginTop: 16 }} accessible accessibilityLabel={`${row.name}、今日 ${formatWeight(row.today, state.weightUnit)}、${comparison}`}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
      <Text style={[styles.body, { flex: 1 }]}>{row.name}</Text>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.body, { fontWeight: '700' }]}>{formatWeight(row.today, state.weightUnit)}</Text>
        <Text style={[styles.small, { color: (row.percent ?? 0) > 0 ? colors.primary : colors.muted }]}>{comparison}</Text>
      </View>
    </View>
    <Animated.View style={{ height: 14, transformOrigin: 'left center', transform: [{ scaleX: reduced ? 1 : progress }] }}>
      <View style={{ position: 'absolute', height: 14, borderRadius: 7, width: `${(row.previous ?? 0) / max * 100}%`, backgroundColor: colors.line }} />
      <View style={{ position: 'absolute', top: 3, height: 8, borderRadius: 4, width: `${row.today / max * 100}%`, backgroundColor: colors.primary }} />
    </Animated.View>
  </View>;
}

export function SessionVolumeChart({ rows, ready }: { rows: Row[]; ready: boolean }) {
  const { styles } = useTheme();
  const reduced = useMotionPreference();
  if (!rows.length) return null;
  const max = Math.max(...rows.flatMap((row) => [row.today, row.previous ?? 0]));
  return <>
    <Text style={styles.sectionTitle}>今日の成果</Text>
    <Card>
      <Text style={styles.small}>総重量（重量 × 回数） · 細い棒：今日 / 背面：前回</Text>
      {rows.map((row, index) => <VolumeRow key={row.exerciseId} row={row} max={max} index={index} ready={ready} reduced={reduced} />)}
    </Card>
  </>;
}
