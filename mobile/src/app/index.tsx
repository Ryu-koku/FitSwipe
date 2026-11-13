import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { IconButton, Screen, useTheme } from '../ui';
import { useApp } from '../context';
import { homeDisplay } from '../home-display';
import { WorkoutCalendar } from '../components/WorkoutCalendar';
import { HomeProgress } from '../components/HomeProgress';
import { MuscleSetsCard } from '../components/MuscleSetsCard';

export default function HomeScreen() {
  const { state } = useApp();
  const { styles } = useTheme();
  const display = homeDisplay(state.homeDisplay);
  const visible = display.cards.filter(card => card.visible);
  return <Screen title="FitSwipe" scroll={false}
    right={<IconButton label="設定" symbol="⚙" onPress={() => router.push('/settings')} />}>
    <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 16 }}>
      <WorkoutCalendar />
      {visible.map(card => card.id === 'progress'
        ? <HomeProgress key={card.id} size={display.progressSize} />
        : <MuscleSetsCard key={card.id} />)}
      {!visible.length && <View style={{ padding: 20, alignItems: 'center' }}>
        <Text style={styles.body}>表示中のカードはありません</Text>
        <Text style={styles.small}>設定 › ホームの表示 で追加</Text>
      </View>}
    </ScrollView>
  </Screen>;
}
