import React from 'react';
import { Text, View } from 'react-native';
import { useApp } from '../context';
import { formatWeight } from '../logic';
import { Card, useTheme } from '../ui';

export function SessionDetails({ sessionIds }: { sessionIds: number[] }) {
  const { state } = useApp();
  const { styles } = useTheme();
  const sets = state.sets.filter((s) => sessionIds.includes(s.sessionId));
  const ids = [...new Set(sets.map((s) => s.exerciseId))];
  return (
    <>
      {ids.map((id) => {
        const exercise = state.exercises.find((e) => e.id === id);
        const rows = sets
          .filter((s) => s.exerciseId === id)
          .sort((a, b) => a.setOrder - b.setOrder);
        return (
          <Card key={id}>
            <Text style={[styles.body, { fontWeight: '800', marginBottom: 8 }]}>
              {exercise?.name ?? '種目'}
            </Text>
            {rows.map((set) => (
              <View key={set.id} style={{ marginBottom: 6 }}>
                <Text style={styles.small}>
                  セット {set.setOrder} · {set.isCompleted ? '完了' : '未完了'}
                </Text>
                {exercise?.mode === 'BILATERAL' ? (
                  <>
                    <Text style={styles.body}>
                      左　{formatWeight(set.leftWeightKg)} ×{' '}
                      {set.leftReps ?? '—'}回 {set.leftCompleted ? '✓' : ''}
                    </Text>
                    <Text style={styles.body}>
                      右　{formatWeight(set.rightWeightKg)} ×{' '}
                      {set.rightReps ?? '—'}回 {set.rightCompleted ? '✓' : ''}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.body}>
                    {formatWeight(set.normalWeightKg)} × {set.normalReps ?? '—'}
                    回
                  </Text>
                )}
              </View>
            ))}
          </Card>
        );
      })}
      {!ids.length && (
        <Text style={styles.muted}>この日の記録はありません</Text>
      )}
    </>
  );
}
