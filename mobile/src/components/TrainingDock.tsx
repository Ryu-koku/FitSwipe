import React, { useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useApp } from '../context';
import { selectedPreset } from '../logic';
import { feedback, useTheme } from '../ui';
import { prepareRestNotifications } from '../rest-notifications';
import { AppIcon } from './AppIcon';

export function TrainingDock() {
  const path = usePathname();
  const preparing = path === '/prepare';
  // Keep the dock scoped to screens that provide its navigation/actions.
  // In particular, the workout completion screen must remain unobstructed.
  const visible = ['/', '/prepare', '/rooms'].includes(path);
  const { state, startWorkout } = useApp();
  const { colors, styles } = useTheme();
  const preset = selectedPreset(state);
  const active = state.sessions.some((s) => s.status === 'IN_PROGRESS');
  const canStart =
    active ||
    !!preset?.exercises.some((c) =>
      state.exercises.some((e) => e.id === c.exerciseId && !e.archived),
    );
  const [starting, setStarting] = useState(false);
  const locked = useRef(false);
  const begin = async () => {
    if (locked.current) return;
    locked.current = true;
    setStarting(true);
    try {
      if (await prepareRestNotifications({ resume: active })) {
        startWorkout(preset?.id);
        router.push('/workout');
      }
    } catch (error) {
      Alert.alert(
        '開始できませんでした',
        error instanceof Error
          ? error.message
          : '休憩通知の設定を確認してください',
      );
    } finally {
      locked.current = false;
      setStarting(false);
    }
  };
  if (!visible) return null;
  const foreground = colors.bg;
  return (
    <View style={{ backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.line,
      minHeight: 80, paddingVertical: 10, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="ホーム" accessibilityState={{ selected: path === '/' }}
          onPress={() => { if (path !== '/') router.replace('/'); }}
          style={{ flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <AppIcon name="home" color={path === '/' ? colors.primary : colors.muted} />
          <Text style={[styles.small, { color: path === '/' ? colors.primary : colors.muted, fontWeight: '700' }]}>ホーム</Text>
        </Pressable>
        {/* Reserve the same space for both sizes so the side navigation stays put. */}
        <View style={{ width: 84, height: 84, marginTop: -28, alignItems: 'center', justifyContent: 'flex-end' }}>
        <Pressable accessibilityRole="button"
          accessibilityLabel={preparing ? active ? 'トレーニングを再開' : 'トレーニングを開始' : 'トレーニングメニューを開く'}
          accessibilityState={{ disabled: preparing && (starting || !canStart), busy: starting }}
          disabled={preparing && (starting || !canStart)}
          onPress={() => { feedback(); if (preparing) void begin(); else router.push('/prepare'); }}
          style={({ pressed }) => [{ width: preparing ? 84 : 56, height: preparing ? 84 : 56,
            borderRadius: preparing ? 42 : 28,
            backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', gap: 4,
            shadowColor: colors.ink, shadowOffset: { width: 0, height: 2 }, shadowOpacity: preparing ? 0.16 : 0, shadowRadius: 5, elevation: preparing ? 4 : 0 },
            pressed && styles.pressed, preparing && (starting || !canStart) && styles.disabled]}>
          <AppIcon name={preparing ? 'play' : 'plus'} color={foreground} size={preparing ? 28 : 30} />
          {preparing && <Text style={[styles.small, { color: foreground, fontWeight: '700' }]}>{starting ? '準備中' : active ? '続きから' : '開始'}</Text>}
        </Pressable>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="ルーム" accessibilityState={{ selected: path === '/rooms' }}
          onPress={() => { if (path !== '/rooms') router.replace('/rooms'); }}
          style={{ flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <AppIcon name="people" color={path === '/rooms' ? colors.primary : colors.muted} />
          <Text style={[styles.small, { color: path === '/rooms' ? colors.primary : colors.muted, fontWeight: '700' }]}>ルーム</Text>
        </Pressable>
    </View>
  );
}
