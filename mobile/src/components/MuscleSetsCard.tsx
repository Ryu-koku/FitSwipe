import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useApp } from '../context';
import { recentMuscleSets } from '../muscle-sets';
import { Card, useTheme } from '../ui';

export function MuscleSetsCard() {
  const { state } = useApp();
  const { colors, styles } = useTheme();
  const today = new Date().toDateString();
  const rows = useMemo(() => recentMuscleSets(state, new Date(today)),
    [state.exercises, state.sessions, state.sets, today]);
  const max = Math.max(1, ...rows.map(row => row.sets));
  return <Card style={{ marginTop: 12, marginBottom: 0, padding: 16 }}>
    <Text style={[styles.body, { fontWeight: '800', fontSize: 17 }]}>直近7日の部位別セット数</Text>
    {rows.map(row => <View key={row.group} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
      <Text style={[styles.body, { width: 74 }]}>{row.group}</Text>
      <View style={{ flex: 1, height: 12, borderRadius: 6, backgroundColor: colors.soft, overflow: 'hidden' }}>
        <View style={{ width: `${row.sets / max * 100}%`, height: 12, borderRadius: 6, backgroundColor: colors.primary }} />
      </View>
      <Text style={[styles.body, { width: 28, textAlign: 'right', fontWeight: '700' }]}>{row.sets}</Text>
    </View>)}
  </Card>;
}
