import React from 'react';
import { useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton, Screen } from '../ui';
import { WorkoutCalendar } from '../components/WorkoutCalendar';
import { GrowthRanking } from '../components/GrowthRanking';

export default function HomeScreen() {
  const { height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const available = height - insets.top - insets.bottom - 56 - 12 - 92;
  const compact = available < 620;
  const otherCards = compact ? 286 + 77 : 322 + 89;
  return <Screen title="FitSwipe" scroll={fontScale > 1.2 || available < otherCards + 24}
    right={<IconButton label="設定" symbol="⚙" onPress={() => router.push('/settings')} />}>
    <View style={{ flex: 1 }}>
      <WorkoutCalendar compact={compact} />
      <GrowthRanking />
    </View>
  </Screen>;
}
