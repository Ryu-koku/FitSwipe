import React, { useEffect, useMemo, useState } from 'react';
import { Animated, PanResponder, Pressable, Text, View } from 'react-native';
import { useApp } from '../context';
import { achievementSummary, completedSessions, completedSets, localDay } from '../logic';
import { Card, IconButton, Sheet, useTheme } from '../ui';
import { SessionDetails } from './SessionDetails';

function startOfWeek(date: Date, monday: boolean) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = monday ? (start.getDay() + 6) % 7 : start.getDay();
  start.setDate(start.getDate() - offset);
  return start;
}

function WeekStreakIcon({ active, color, mutedColor, glowColor }: { active: boolean; color: string; mutedColor: string; glowColor: string }) {
  const [motion] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!active) {
      motion.setValue(0);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(motion, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(motion, { toValue: 0.35, duration: 120, useNativeDriver: true }),
        Animated.timing(motion, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(motion, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [active, motion]);

  const rotate = motion.interpolate({ inputRange: [0, 1], outputRange: ['-12deg', '12deg'] });
  return (
    <View style={{ width: 22, height: 24, alignItems: 'center', justifyContent: 'center' }}>
      {active && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: 15,
            height: 15,
            borderRadius: 99,
            backgroundColor: glowColor,
            opacity: motion.interpolate({ inputRange: [0, 1], outputRange: [0.06, 0.38] }),
            transform: [{ scale: motion.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1.5] }) }],
          }}
        />
      )}
      <Animated.Text
        style={{
          color: active ? color : mutedColor,
          fontSize: 16,
          opacity: active ? motion.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }) : 1,
          transform: [
            { translateY: active ? motion.interpolate({ inputRange: [0, 1], outputRange: [1, -2] }) : 0 },
            { scale: active ? motion.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.22] }) : 1 },
            { rotate: active ? rotate : '0deg' },
          ],
        }}
      >
        🔥
      </Animated.Text>
    </View>
  );
}

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
  const streakWeeks = achievementSummary(state).streakWeeks;
  const currentWeekStart = startOfWeek(new Date(), state.weekStartsMonday);
  const currentWeekKey = localDay(currentWeekStart);
  const sessionsWithCompletedSets = new Set(completedSets(state).map((set) => set.sessionId));
  const recordedWeeks = new Set(
    sessions
      .filter((session) => sessionsWithCompletedSets.has(session.id) && localDay(session.startedAt) <= localDay(new Date()))
      .map((session) => localDay(startOfWeek(new Date(session.startedAt), state.weekStartsMonday))),
  );
  const latestStreakWeek = new Date(currentWeekStart);
  if (!recordedWeeks.has(currentWeekKey)) latestStreakWeek.setDate(latestStreakWeek.getDate() - 7);
  const latestStreakWeekKey = localDay(latestStreakWeek);
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
              {month.getFullYear() !== new Date().getFullYear() && `${month.getFullYear()}年 `}
              {month.getMonth() + 1}月
            </Text>
            <IconButton label="次の月" symbol="›" onPress={() => move(1)} />
          </View>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ flex: 1.15 }} />
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
              {(() => {
                const firstDay = week * 7 - leading + 1;
                const rowStart = new Date(month.getFullYear(), month.getMonth(), firstDay);
                const weekStartKey = localDay(startOfWeek(rowStart, state.weekStartsMonday));
                const weekTrained = Array.from({ length: 7 }, (_, offset) =>
                  days.has(localDay(new Date(month.getFullYear(), month.getMonth(), firstDay + offset))),
                ).some(Boolean);
                const streakAtWeek = streakWeeks > 0 && weekStartKey === latestStreakWeekKey ? streakWeeks : undefined;
                return (
                  <View
                    accessible
                    accessibilityLabel={streakAtWeek ? `現在のストリーク${streakAtWeek}週` : weekTrained ? 'この週はトレーニング達成' : 'この週は未達成'}
                    style={{ flex: 1.15, height: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 1 }}
                  >
                    <WeekStreakIcon active={weekTrained} color={colors.primary} mutedColor={colors.muted} glowColor={colors.orange} />
                    {streakAtWeek !== undefined && (
                      <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '800' }}>{streakAtWeek}</Text>
                    )}
                  </View>
                );
              })()}
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
