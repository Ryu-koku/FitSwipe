import React from 'react';
import { useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton, Screen } from '../ui';
import { WorkoutCalendar } from '../components/WorkoutCalendar';
import { GrowthRanking } from '../components/GrowthRanking';

export default function HomeScreen() {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const available = height - insets.top - insets.bottom - 56 - 12 - 92;
  const compact = available < 620;
  return <Screen title="FitSwipe" scrollOnlyWhenOverflow
    right={<IconButton label="設定" symbol="⚙" onPress={() => router.push('/settings')} />}>
      <WorkoutCalendar compact={compact} />
      <GrowthRanking />
  </Screen>;
}
