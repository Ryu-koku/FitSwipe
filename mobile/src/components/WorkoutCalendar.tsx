import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, Text, View } from 'react-native';
import { useApp } from '../context';
import { achievementSummary, completedSessions, completedSets, localDay } from '../logic';
import { Card, IconButton, Sheet, useTheme } from '../ui';
import { SessionDetails } from './SessionDetails';
import { AppIcon } from './AppIcon';
import { useReducedMotion } from '../use-reduced-motion';

function startOfWeek(date: Date, monday: boolean) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - (monday ? (start.getDay() + 6) % 7 : start.getDay()));
  return start;
}

export function WorkoutCalendar({ compact = false }: { compact?: boolean }) {
  const { state } = useApp();
  const { colors, styles } = useTheme();
  const reduced = useReducedMotion();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState<string>();
  const [width, setWidth] = useState(0);
  const [offset] = useState(() => new Animated.Value(0));
  const moving = useRef(false);
  const move = useCallback((delta: number) => {
    if (moving.current || !width) return;
    moving.current = true;
    Animated.timing(offset, { toValue: -delta * width, duration: reduced ? 0 : 230, useNativeDriver: true })
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
      else Animated.spring(offset, { toValue: 0, useNativeDriver: true, overshootClamping: true }).start();
    },
    onPanResponderTerminate: () => { offset.setValue(0); },
    });
    const timer = setTimeout(() => setResponder(pan), 0);
    return () => clearTimeout(timer);
  }, [width, offset, move, reduced]);
  const sessions = completedSessions(state);
  const days = new Set(sessions.map((s) => localDay(s.startedAt)));
  const streakWeeks = achievementSummary(state).streakWeeks;
  const today = localDay(new Date());
  const currentWeekStart = startOfWeek(new Date(), state.weekStartsMonday);
  const sessionsWithSets = new Set(completedSets(state).map((set) => set.sessionId));
  const recordedWeeks = new Set(sessions.filter((s) => sessionsWithSets.has(s.id) && localDay(s.startedAt) <= today)
    .map((s) => localDay(startOfWeek(new Date(s.startedAt), state.weekStartsMonday))));
  if (!recordedWeeks.has(localDay(currentWeekStart))) currentWeekStart.setDate(currentWeekStart.getDate() - 7);
  const rowHeight = compact ? 32 : 38;
  const renderMonth = (delta: number) => {
    const date = new Date(month.getFullYear(), month.getMonth() + delta, 1);
    const leading = state.weekStartsMonday ? (date.getDay() + 6) % 7 : date.getDay();
    const length = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    return <View key={delta} style={{ width }} aria-hidden={delta !== 0} accessibilityElementsHidden={delta !== 0} importantForAccessibility={delta ? 'no-hide-descendants' : 'auto'}>
      <View style={styles.row}>
        <IconButton label="前の月" symbol="‹" disabled={delta !== 0} onPress={() => move(-1)} />
        <Text accessibilityLiveRegion="polite" style={[styles.body, { fontWeight: '700' }]}>{date.getFullYear() !== new Date().getFullYear() ? `${date.getFullYear()}年` : ''}{date.getMonth() + 1}月</Text>
        <IconButton label="次の月" symbol="›" disabled={delta !== 0} onPress={() => move(1)} />
      </View>
       <View style={{ flexDirection: 'row' }}><View accessibilityLabel={`ストリーク ${streakWeeks}週`} style={{ flex: 1.15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}><AppIcon name="flame" size={15} color={colors.primary} /><Text style={{ color: colors.primary, fontSize: 11, fontWeight: '800', marginLeft: 2 }}>{streakWeeks}</Text></View>
        {(state.weekStartsMonday ? ['月', '火', '水', '木', '金', '土', '日'] : ['日', '月', '火', '水', '木', '金', '土']).map((label) => <Text key={label} style={[styles.small, { flex: 1, textAlign: 'center' }]}>{label}</Text>)}
      </View>
      {Array.from({ length: 6 }, (_, week) => {
        const first = week * 7 - leading + 1;
        const weekKey = localDay(startOfWeek(new Date(date.getFullYear(), date.getMonth(), first), state.weekStartsMonday));
        const trained = recordedWeeks.has(weekKey);
        return <View key={week} style={{ flexDirection: 'row' }}>
          <View accessible accessibilityLabel={trained ? 'この週はトレーニング達成' : 'この週は未達成'} style={{ flex: 1.15, height: rowHeight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <AppIcon name="flame" size={17} color={trained ? colors.primary : colors.line} />
          </View>
          {Array.from({ length: 7 }, (_, col) => {
            const day = first + col;
            const key = localDay(new Date(date.getFullYear(), date.getMonth(), day));
            const done = days.has(key);
            return <View key={col} style={{ flex: 1, height: rowHeight, alignItems: 'center', justifyContent: 'center' }}>
              {day > 0 && day <= length && <Pressable accessibilityRole="button" accessibilityLabel={`${date.getMonth() + 1}月${day}日${key === today ? '、今日' : ''}${done ? '、トレーニング記録あり' : ''}`}
                disabled={!done || delta !== 0} onPress={() => setSelected(key)}
                style={{ width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: key === today ? colors.soft : done ? colors.primary : 'transparent', borderWidth: key === today ? 1 : 0, borderColor: colors.primary }}>
                <Text style={{ color: done && key !== today ? colors.bg : colors.ink }}>{day}</Text>
              </Pressable>}
            </View>;
          })}
        </View>;
      })}
    </View>;
  };
  return <>
    <Card style={{ padding: 8 }}>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ overflow: 'hidden' }} {...responder?.panHandlers}>
        <Animated.View style={{ flexDirection: 'row', width: width * 3, marginLeft: -width, transform: [{ translateX: offset }] }}>
          {[-1, 0, 1].map(renderMonth)}
        </Animated.View>
      </View>
    </Card>
    {selected && <Sheet title={new Date(`${selected}T12:00:00`).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })} onClose={() => setSelected(undefined)}>
      <SessionDetails sessionIds={sessions.filter((s) => localDay(s.startedAt) === selected).map((s) => s.id)} />
    </Sheet>}
  </>;
}
