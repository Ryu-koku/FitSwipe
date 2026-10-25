import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../context';
import { completedSessions, localDay } from '../logic';
import { Card, Chip, Screen, SectionTitle, useTheme } from '../ui';

export default function RecordsScreen() {
  const { state } = useApp();
  const { styles } = useTheme();
  const [presetId, setPresetId] = useState(
    state.selectedPresetId ?? state.presets[0]?.id,
  );
  const preset = state.presets.find((p) => p.id === presetId);
  const ids = preset?.exercises.map((c) => c.exerciseId) ?? [];
  const uniqueMatch =
    ids.length > 0 &&
    state.presets.filter(
      (p) =>
        p.exercises.length === ids.length &&
        p.exercises.every((c) => ids.includes(c.exerciseId)),
    ).length === 1;
  const points = completedSessions(state)
    .filter(
      (s) =>
        s.presetId === presetId ||
        (!s.presetId &&
          uniqueMatch &&
          (() => {
            const actual = [
              ...new Set(
                state.sets
                  .filter((set) => set.sessionId === s.id)
                  .map((set) => set.exerciseId),
              ),
            ];
            return (
              actual.length === ids.length &&
              actual.every((id) => ids.includes(id))
            );
          })()),
    )
    .map((session) => ({
      date: localDay(session.startedAt),
      value: state.sets
        .filter(
          (s) =>
            s.sessionId === session.id &&
            s.isCompleted &&
            ids.includes(s.exerciseId),
        )
        .reduce(
          (sum, s) =>
            sum +
            (s.normalWeightKg ?? 0) +
            (s.leftWeightKg ?? 0) +
            (s.rightWeightKg ?? 0),
          0,
        ),
    }))
    .filter((p) => p.value > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  return (
    <Screen title="記録" onBack={() => router.back()}>
      <SectionTitle>プリセット</SectionTitle>
      <View style={styles.wrap}>
        {state.presets.map((p) => (
          <Chip
            key={p.id}
            label={p.name}
            active={p.id === presetId}
            onPress={() => setPresetId(p.id)}
          />
        ))}
      </View>
      <Text style={styles.small}>
        {ids.length}種目の重量 × 完了セット数の合計
      </Text>
      {points.length ? (
        <>
          <Card style={{ marginTop: 16 }}>
            <Text style={styles.small}>直近の合計</Text>
            <Text style={styles.metric}>
              {Number(points.at(-1)!.value.toFixed(2))} kg·セット
            </Text>
            <Text style={styles.small}>{points.at(-1)!.date}</Text>
          </Card>
          <Card>
            <Text style={styles.body}>合計重量の推移</Text>
            <LineChart points={points.slice(-7)} />
          </Card>
          <Text style={styles.small}>
            各種目の完了セットに記録された重量を合計しています。回数は含みません。
          </Text>
        </>
      ) : (
        <Card style={{ marginTop: 16 }}>
          <Text style={styles.muted}>
            このプリセットの重量記録はまだありません
          </Text>
        </Card>
      )}
    </Screen>
  );
}

function LineChart({ points }: { points: { date: string; value: number }[] }) {
  const { colors, styles } = useTheme();
  const [width, setWidth] = useState(1);
  const max = Math.max(1, ...points.map((p) => p.value));
  const positions = points.map((p, i) => ({
    x:
      points.length === 1
        ? width / 2
        : 8 + (i * (width - 16)) / (points.length - 1),
    y: 158 - (p.value / max) * 140,
  }));
  return (
    <>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{ height: 180, marginTop: 12 }}
      >
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: 1,
              top: 18 + (i * 140) / 3,
              backgroundColor: colors.line,
            }}
          />
        ))}
        {positions.slice(1).map((p, i) => {
          const previous = positions[i];
          const dx = p.x - previous.x;
          const dy = p.y - previous.y;
          const length = Math.hypot(dx, dy);
          return (
            <View
              key={`line-${i}`}
              style={{
                position: 'absolute',
                left: (previous.x + p.x) / 2 - length / 2,
                top: (previous.y + p.y) / 2,
                width: length,
                height: 3,
                backgroundColor: colors.primary,
                transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
              }}
            />
          );
        })}
        {positions.map((p, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: p.x - 5,
              top: p.y - 5,
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: colors.primary,
            }}
          />
        ))}
      </View>
      <View style={styles.row}>
        {points.map((p, i) => (
          <Text key={i} style={styles.small}>
            {p.date.slice(5).replace('-', '/')}
          </Text>
        ))}
      </View>
    </>
  );
}
