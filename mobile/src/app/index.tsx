import React from 'react';
import { useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context';
import { IconButton, Screen } from '../ui';
import { WorkoutCalendar } from '../components/WorkoutCalendar';
import { StrengthGrowth } from '../components/StrengthGrowth';

export default function HomeScreen() {
  const { height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const available = height - insets.top - insets.bottom - 56 - 12 - 92;
  const compact = available < 620;
  const chartBase = 123;
  const otherCards = compact ? 286 + 77 : 322 + 89;
  const graphHeight = Math.max(24, Math.min(120, available - otherCards - chartBase));
  return <Screen title="FitSwipe" scroll={fontScale > 1.2 || available < otherCards + chartBase + 24}
    right={<IconButton label="設定" symbol="⚙" onPress={() => router.push('/settings')} />}>
    <View style={{ flex: 1 }}>
      <WorkoutCalendar compact={compact} />
      <StrengthGrowth compact height={graphHeight} />
    </View>
  </Screen>;
}
