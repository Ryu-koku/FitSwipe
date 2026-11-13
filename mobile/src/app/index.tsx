import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { IconButton, Screen } from '../ui';
import { WorkoutCalendar } from '../components/WorkoutCalendar';
import { HomeProgress } from '../components/HomeProgress';

export default function HomeScreen() {
  const [viewportHeight, setViewportHeight] = useState(0);
  const [calendarHeight, setCalendarHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const overflowing = contentHeight > viewportHeight + 1;
  return <Screen title="FitSwipe" scroll={false}
    right={<IconButton label="設定" symbol="⚙" onPress={() => router.push('/settings')} />}>
    <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled"
      onLayout={(event) => { const next = event.nativeEvent.layout.height; if (Math.abs(next - viewportHeight) >= 1) setViewportHeight(next); }}
      onContentSizeChange={(_, height) => { if (Math.abs(height - contentHeight) >= 1) setContentHeight(height); }}
      scrollEnabled={overflowing} bounces={overflowing}
      contentContainerStyle={{ flexGrow: 1, paddingBottom: 16 }}>
      <View onLayout={(event) => { const next = event.nativeEvent.layout.height; if (Math.abs(next - calendarHeight) >= 1) setCalendarHeight(next); }}>
        <WorkoutCalendar />
      </View>
      <HomeProgress layoutReady={viewportHeight > 0 && calendarHeight > 0} availableHeight={Math.max(0, viewportHeight - calendarHeight - 12 - 16)} />
    </ScrollView>
  </Screen>;
}
