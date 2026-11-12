import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, Text, View } from 'react-native';
import { useApp } from '../context';
import { achievementSummary, completedSessions, completedSets, localDay, presetColor } from '../logic';
import { Card, Sheet, useTheme } from '../ui';
import { SessionDetails } from './SessionDetails';
import { AppIcon } from './AppIcon';
import { StreakFlame } from './StreakFlame';
import { useReducedMotion } from '../use-reduced-motion';

function startOfWeek(date: Date, monday: boolean) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - (monday ? (start.getDay() + 6) % 7 : start.getDay()));
  return start;
}

export function WorkoutCalendar() {
  const { state } = useApp();
  const { colors, styles } = useTheme();
  const reduced = useReducedMotion();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState<string>();
  const [width, setWidth] = useState(0);
  const [offset] = useState(() => new Animated.Value(0));
  const [calendarHeight] = useState(() => new Animated.Value(0));
  const measuredHeight = useRef(0);
  const monthHeights = useRef(new Map<string, number>());
  const [heightReady, setHeightReady] = useState(false);
  const resizeCalendar = useCallback((next: number) => {
    if (!next || next === measuredHeight.current) return;
    const animate = measuredHeight.current > 0 && !reduced;
    measuredHeight.current = next;
    calendarHeight.stopAnimation();
    if (animate) {
      Animated.timing(calendarHeight, { toValue: next, duration: 200, useNativeDriver: false }).start();
    } else calendarHeight.setValue(next);
    setHeightReady(true);
  }, [calendarHeight, reduced]);
  useLayoutEffect(() => {
    const height = monthHeights.current.get(`${month.getFullYear()}-${month.getMonth()}`);
    if (height !== undefined) resizeCalendar(height);
  }, [month, width, resizeCalendar]);
  const moving = useRef(false);
  const move = useCallback((delta: number) => {
    if (moving.current || !width) return;
    moving.current = true;
    // Keep the final translation reset on the same JS timeline as the month
    // commit, instead of briefly showing new dates at the old native offset.
    Animated.timing(offset, { toValue: -delta * width, duration: reduced ? 0 : 230, useNativeDriver: false })
      .start(({ finished }) => {
        if (finished) {
          setSelected(undefined);
          setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
        } else moving.current = false;
      });
  }, [offset, width, reduced]);
  useLayoutEffect(() => { offset.setValue(0); moving.current = false; }, [month, width, offset]);
  const [responder, setResponder] = useState<ReturnType<typeof PanResponder.create> | null>(null);
  useEffect(() => {
    const pan = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => !moving.current && Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderMove: (_, g) => { if (!moving.current && !reduced) offset.setValue(Math.max(-width, Math.min(width, g.dx))); },
    onPanResponderRelease: (_, g) => {
      if (Math.abs(g.dx) > Math.min(60, width / 5) || Math.abs(g.vx) > 0.5) move(g.dx > 0 ? -1 : 1);
      else Animated.spring(offset, { toValue: 0, useNativeDriver: false, overshootClamping: true }).start();
    },
    onPanResponderTerminate: () => { offset.setValue(0); },
    });
    const timer = setTimeout(() => setResponder(pan), 0);
    return () => clearTimeout(timer);
  }, [width, offset, move, reduced]);
  const sessions = completedSessions(state);

  const { streakWeeks, longestStreakWeeks } = achievementSummary(state);
  const today = localDay(new Date());
  const sessionsWithSets = new Set(completedSets(state).map((set) => set.sessionId));
  // Mark only days with a completed set, like the streak and training-day count.
  // Each day takes the color of its last workout's preset.
  // Sessions without a preset use the theme color.
  const dayColors = new Map<string, string[]>();
  const colorOf = (presetId?: string) => presetColor(state.presets.find((p) => p.id === presetId), colors.primary);
  for (const s of sessions.filter((s) => sessionsWithSets.has(s.id)).sort((a, b) => a.startedAt.localeCompare(b.startedAt))) {
    const key = localDay(s.startedAt), color = colorOf(s.presetId);
    dayColors.set(key, [...(dayColors.get(key) ?? []).filter((c) => c !== color), color]);
  }
  const days = new Set(dayColors.keys());
  const recordedWeeks = new Set(sessions.filter((s) => sessionsWithSets.has(s.id) && localDay(s.startedAt) <= today)
    .map((s) => localDay(startOfWeek(new Date(s.startedAt), state.weekStartsMonday))));
  const rowHeight = 36;
  const renderMonth = (delta: number) => {
    const date = new Date(month.getFullYear(), month.getMonth() + delta, 1);
    const leading = state.weekStartsMonday ? (date.getDay() + 6) % 7 : date.getDay();
    const length = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const weeks = Math.ceil((leading + length) / 7);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    const isCurrentMonth = date.getFullYear() === new Date().getFullYear() && date.getMonth() === new Date().getMonth();
    const displayedStreak = streakWeeks || longestStreakWeeks;
    const showStreak = isCurrentMonth && displayedStreak > 0;
    // Only the visible month determines the strip height; adjacent swipe pages
    // may have more weeks and must not leave empty space under this month.
    return <View key={monthKey} onLayout={(event) => {
      const next = event.nativeEvent.layout.height;
      monthHeights.current.set(monthKey, next);
      if (delta === 0) resizeCalendar(next);
    }} style={{ width: '100%', ...(delta !== 0 ? { position: 'absolute' as const, top: 0, left: delta * width } : {}) }} aria-hidden={delta !== 0} accessibilityElementsHidden={delta !== 0} importantForAccessibility={delta ? 'no-hide-descendants' : 'auto'}>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <View accessibilityLabel={showStreak ? `${streakWeeks ? '現在の連続記録' : '過去最高の連続記録'} ${displayedStreak}週` : undefined} style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>{showStreak && <><StreakFlame animate={delta === 0} color={colors.primary} /><Text style={{ color: colors.primary, fontSize: 16, fontWeight: '800', marginLeft: 3 }}>{displayedStreak}週連続!</Text></>}</View>
        <View accessibilityLabel={isCurrentMonth ? '今月' : undefined} style={{ alignItems: 'center' }}>
          <Text accessibilityLiveRegion="polite" style={[styles.body, { fontWeight: '700' }]}>{date.getFullYear() !== new Date().getFullYear() ? `${date.getFullYear()}年` : ''}{date.getMonth() + 1}月</Text>
          <View style={{ height: 2, width: 18, marginTop: 2, borderRadius: 1, backgroundColor: isCurrentMonth ? colors.primary : 'transparent' }} />
        </View>
        <View style={{ flex: 1 }} />
      </View>
       <View style={{ flexDirection: 'row' }}><View style={{ flex: 1.15 }} />
        {(state.weekStartsMonday ? ['月', '火', '水', '木', '金', '土', '日'] : ['日', '月', '火', '水', '木', '金', '土']).map((label) => <Text key={label} style={[styles.small, { flex: 1, textAlign: 'center' }]}>{label}</Text>)}
      </View>
      {Array.from({ length: weeks }, (_, week) => {
        const first = week * 7 - leading + 1;
        const weekKey = localDay(startOfWeek(new Date(date.getFullYear(), date.getMonth(), first), state.weekStartsMonday));
        const trained = recordedWeeks.has(weekKey);
        return <View key={week} style={{ flexDirection: 'row' }}>
          <View accessible={first <= length && first + 6 >= 1} accessibilityLabel={trained ? 'この週はトレーニング達成' : 'この週は未達成'} style={{ flex: 1.15, height: rowHeight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            {first <= length && first + 6 >= 1 && <AppIcon name="flame" size={17} color={trained ? colors.primary : colors.line} />}
          </View>
          {Array.from({ length: 7 }, (_, col) => {
            const day = first + col;
            const key = localDay(new Date(date.getFullYear(), date.getMonth(), day));
            const done = days.has(key);
            const dayColor = dayColors.get(key)?.at(-1) ?? colors.primary;
            return <View key={col} style={{ flex: 1, height: rowHeight, alignItems: 'center', justifyContent: 'center' }}>
              {day > 0 && day <= length && <Pressable accessibilityRole="button" accessibilityLabel={`${date.getMonth() + 1}月${day}日${key === today ? '、今日' : ''}${done ? '、トレーニング記録あり' : ''}`}
                disabled={!done || delta !== 0} onPress={() => setSelected(key)}
                style={{ width: '100%', height: rowHeight, alignItems: 'center', justifyContent: 'center' }}>
                <View pointerEvents="none" style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: key === today ? colors.soft : done ? dayColor : 'transparent', borderWidth: key === today || key === selected ? 1 : 0, borderColor: done ? dayColor : colors.primary }}>
                <Text style={{ color: done && key !== today ? colors.bg : colors.ink, lineHeight: 17 }}>{day}</Text>

                </View>
              </Pressable>}
            </View>;
          })}
        </View>;
      })}
    </View>;
  };
  return <>
    <Card style={{ padding: 12, marginBottom: 0 }}>
      <Animated.View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ overflow: 'hidden', ...(heightReady ? { height: calendarHeight } : {}) }} {...responder?.panHandlers}>
        {/* Keep the current month in flow so the record card has its final position on the first layout. */}
        <Animated.View style={{ transform: [{ translateX: offset }] }}>
          {(width ? [-1, 0, 1] : [0]).map(renderMonth)}
        </Animated.View>
      </Animated.View>
    </Card>
    {selected && <Sheet title={new Date(`${selected}T12:00:00`).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })} onClose={() => setSelected(undefined)}>
      <SessionDetails sessionIds={sessions.filter((s) => localDay(s.startedAt) === selected).map((s) => s.id)} />
    </Sheet>}
  </>;
}
