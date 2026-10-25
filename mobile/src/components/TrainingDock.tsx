import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Pressable, Text, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useApp } from '../context';
import { selectedPreset } from '../logic';
import { feedback, useTheme } from '../ui';
import { prepareRestNotifications } from '../rest-notifications';

export function TrainingDock() {
  const path = usePathname();
  const preparing = path === '/prepare';
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
  const [progress] = useState(() => new Animated.Value(preparing ? 1 : 0));
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
  useEffect(() => {
    Animated.timing(progress, {
      toValue: preparing ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [preparing, progress]);
  if (!visible) return null;
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 112,
      }}
    >
      <Animated.View
        pointerEvents={preparing ? 'none' : 'auto'}
        accessibilityElementsHidden={preparing}
        importantForAccessibility={preparing ? 'no-hide-descendants' : 'auto'}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 72,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          backgroundColor: colors.surface,
          flexDirection: 'row',
          alignItems: 'center',
          opacity: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0],
          }),
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 26],
              }),
            },
          ],
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="ホーム"
          onPress={() => router.replace('/')}
          style={{ flex: 1, alignItems: 'center', padding: 16 }}
        >
          <Text style={[styles.tab, { paddingVertical: 0 }]}>⌂</Text>
          <Text style={path === '/' ? styles.tab : styles.small}>ホーム</Text>
        </Pressable>
        <View style={{ width: 104 }} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="ルーム"
          onPress={() => router.replace('/rooms')}
          style={{ flex: 1, alignItems: 'center', padding: 16 }}
        >
          <Text style={[styles.tab, { paddingVertical: 0 }]}>♧</Text>
          <Text style={path === '/rooms' ? styles.tab : styles.small}>
            ルーム
          </Text>
        </Pressable>
      </Animated.View>
      {preparing && (
        <Text style={[styles.tab, { textAlign: 'center', paddingVertical: 0 }]}>
          {active ? 'トレーニングを再開' : (preset?.name ?? 'プリセットを選択')}
        </Text>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          preparing
            ? active
              ? 'トレーニングを再開'
              : 'トレーニングを開始'
            : 'トレーニングを準備'
        }
        accessibilityState={{ disabled: starting || (preparing && !canStart) }}
        disabled={starting || (preparing && !canStart)}
        onPress={() => {
          feedback();
          if (preparing) {
            void begin();
          } else router.push('/prepare');
        }}
        style={{
          position: 'absolute',
          bottom: 18,
          left: '50%',
          marginLeft: -36,
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: preparing && !canStart ? 0.4 : 1,
        }}
      >
        <Text
          style={{
            color: colors.bg,
            fontSize: preparing ? 32 : 42,
            fontWeight: '500',
          }}
        >
          {starting ? '…' : preparing ? '▶' : '+'}
        </Text>
      </Pressable>
    </View>
  );
}
