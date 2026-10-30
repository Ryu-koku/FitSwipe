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
  const selectedTabStyle = {
    backgroundColor: colors.soft,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 5,
    elevation: 4,
  };
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
      if (await prepareRestNotifications()) {
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
  return (
    <View
      pointerEvents="box-none"
      style={{
        height: 80,
        backgroundColor: colors.bg,
      }}
    >
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 80,
          borderTopWidth: 1,
          borderColor: colors.line,
          backgroundColor: colors.surface,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="ホーム"
          onPress={() => { if (path !== '/') router.replace('/'); }}
          accessibilityState={{ selected: path === '/' }}
          style={{ flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 4 }}
        >
          <View style={[{ paddingHorizontal: 16, paddingVertical: 4 }, path === '/' && selectedTabStyle]}>
            <AppIcon name="home" color={path === '/' ? colors.primary : colors.muted} />
          </View>
          <Text style={[styles.small, { color: path === '/' ? colors.primary : colors.muted, fontWeight: '700' }]}>ホーム</Text>
        </Pressable>
        <View style={{ flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={preparing ? active ? 'トレーニングを再開' : 'トレーニングを開始' : 'トレーニング'}
          hitSlop={preparing ? { bottom: 20 } : undefined}
          accessibilityState={{ selected: preparing, disabled: starting || (preparing && !canStart) }}
          disabled={starting || (preparing && !canStart)}
          onPress={() => { feedback(); if (preparing) void begin(); else router.push('/prepare'); }}
          style={[preparing && selectedTabStyle, { width: preparing ? 84 : '100%', height: preparing ? 84 : '100%', flexShrink: 0, transform: [{ translateY: preparing ? -22 : 0 }], borderRadius: preparing ? 42 : 0, backgroundColor: preparing ? colors.primary : 'transparent', alignItems: 'center', justifyContent: 'center', gap: 4, opacity: preparing && !canStart ? 0.4 : 1 }]}
        >
          {starting ? <Text style={{ color: colors.bg }}>…</Text> : <AppIcon name="play" color={preparing ? colors.bg : colors.muted} size={preparing ? 38 : 24} />}
          {!preparing && <Text style={[styles.small, { color: colors.muted, fontWeight: '700' }]}>トレーニング</Text>}
        </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="ルーム"
          onPress={() => { if (path !== '/rooms') router.replace('/rooms'); }}
          accessibilityState={{ selected: path === '/rooms' }}
          style={{ flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 4 }}
        >
          <View style={[{ paddingHorizontal: 16, paddingVertical: 4 }, path === '/rooms' && selectedTabStyle]}>
            <AppIcon name="people" color={path === '/rooms' ? colors.primary : colors.muted} />
          </View>
          <Text style={[styles.small, { color: path === '/rooms' ? colors.primary : colors.muted, fontWeight: '700' }]}>
            ルーム
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
