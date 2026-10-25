import React from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../context';
import { Button, Card, Screen, useTheme } from '../ui';

export default function CompleteScreen() {
  const { state } = useApp();
  const { colors, styles } = useTheme();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const session = state.sessions.find((s) => s.id === Number(sessionId));
  const sets = state.sets.filter(
    (s) => s.sessionId === session?.id && s.isCompleted,
  );
  const starts = sets.map((s) =>
    new Date(s.createdAt ?? session!.startedAt).getTime(),
  );
  const ends = sets.map((s) =>
    new Date(s.updatedAt ?? session!.endedAt ?? session!.startedAt).getTime(),
  );
  const minutes = sets.length
    ? Math.max(1, Math.floor((Math.max(...ends) - Math.min(...starts)) / 60000))
    : 0;
  return (
    <Screen title="完了">
      <View style={{ alignItems: 'center', paddingTop: 36 }}>
        <View
          style={{
            borderRadius: 56,
            backgroundColor: colors.primary,
            height: 112,
            width: 112,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 60, color: colors.bg }}>✓</Text>
        </View>
        <Text style={[styles.title, { marginVertical: 24 }]}>
          おつかれさま！
        </Text>
      </View>
      <View style={[styles.row, { marginBottom: 16 }]}>
        {[
          [new Set(sets.map((s) => s.exerciseId)).size, '種目'],
          [sets.length, 'セット'],
          [minutes, '分'],
        ].map(([value, label]) => (
          <Card key={label} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.metric}>{value}</Text>
            <Text style={styles.small}>{label}</Text>
          </Card>
        ))}
      </View>
      <Button label="ホームに戻る" onPress={() => router.replace('/')} />
      <Button
        label="ルームへ共有"
        secondary
        disabled={!session}
        onPress={() =>
          router.push({
            pathname: '/rooms',
            params: { shareSessionId: String(session?.id) },
          })
        }
      />
    </Screen>
  );
}
