import React, { useMemo, useState } from 'react';
import { PanResponder, Pressable, Text, View } from 'react-native';
import { useApp } from '../context';
import { completedSessions, localDay } from '../logic';
import { Card, IconButton, Sheet, useTheme } from '../ui';
import { SessionDetails } from './SessionDetails';

export function WorkoutCalendar() {
  const { state } = useApp();
  const { colors, styles } = useTheme();
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selected, setSelected] = useState<string>();
  const move = (delta: number) => {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
    setSelected(undefined);
  };
  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 15 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderRelease: (_, g) => {
          if (Math.abs(g.dx) > 40) move(g.dx > 0 ? -1 : 1);
        },
      }),
    [],
  );
  const sessions = completedSessions(state);
  const days = new Set(sessions.map((s) => localDay(s.startedAt)));
  const leading = state.weekStartsMonday
    ? (month.getDay() + 6) % 7
    : month.getDay();
  const length = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const cells = Math.ceil((leading + length) / 7) * 7;
  const today = localDay(new Date());
  return (
    <>
      <Card style={{ padding: 10 }}>
        <View {...responder.panHandlers}>
          <View style={styles.row}>
            <IconButton label="前の月" symbol="‹" onPress={() => move(-1)} />
            <Text style={[styles.body, { fontWeight: '800' }]}>
              {month.getFullYear()}年 {month.getMonth() + 1}月
            </Text>
            <IconButton label="次の月" symbol="›" onPress={() => move(1)} />
          </View>
          <View style={{ flexDirection: 'row' }}>
            {(state.weekStartsMonday
              ? ['月', '火', '水', '木', '金', '土', '日']
              : ['日', '月', '火', '水', '木', '金', '土']
            ).map((label) => (
              <Text
                key={label}
                style={[styles.small, { flex: 1, textAlign: 'center' }]}
              >
                {label}
              </Text>
            ))}
          </View>
          {Array.from({ length: cells / 7 }, (_, week) => (
            <View key={week} style={{ flexDirection: 'row' }}>
              {Array.from({ length: 7 }, (_, col) => {
                const day = week * 7 + col - leading + 1;
                const key = localDay(
                  new Date(month.getFullYear(), month.getMonth(), day),
                );
                const trained = days.has(key);
                return (
                  <View
                    key={col}
                    style={{
                      flex: 1,
                      height: 38,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {day > 0 && day <= length && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${month.getMonth() + 1}月${day}日${key === today ? '、今日' : ''}${trained ? '、トレーニング記録あり' : ''}`}
                        disabled={!trained}
                        onPress={() => setSelected(key)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 12,
                          backgroundColor:
                            key === today
                              ? colors.soft
                              : trained
                                ? colors.primary
                                : 'transparent',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text
                          style={{
                            color:
                              trained && key !== today ? colors.bg : colors.ink,
                          }}
                        >
                          {day}
                        </Text>
                        {key === today && (
                          <View
                            style={{
                              width: 12,
                              height: 2,
                              backgroundColor: colors.primary,
                            }}
                          />
                        )}
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </Card>
      {selected && (
        <Sheet
          title={new Date(`${selected}T12:00:00`).toLocaleDateString('ja-JP', {
            month: 'long',
            day: 'numeric',
            weekday: 'short',
          })}
          onClose={() => setSelected(undefined)}
        >
          <SessionDetails
            sessionIds={sessions
              .filter((s) => localDay(s.startedAt) === selected)
              .map((s) => s.id)}
          />
        </Sheet>
      )}
    </>
  );
}
