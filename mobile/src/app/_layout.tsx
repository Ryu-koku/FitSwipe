import { Stack, usePathname } from 'expo-router';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppProvider, useApp } from '../context';
import { ThemeProvider, useTheme } from '../ui';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { TrainingDock } from '../components/TrainingDock';
import { RestNotifications } from '../rest-notifications';
import { AccountPanel } from '../components/AccountPanel';
import { trainingLevel } from '../logic';

export default function Layout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <ThemeProvider>
          <AppLayout />
        </ThemeProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}

function AppLayout() {
  const { ready, error, state } = useApp();
  const pathname = usePathname();
  const { level, trainingDays } = trainingLevel(state);
  const { colors, styles, isDark } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {error && (
        <Text
          accessibilityRole="alert"
          style={{ color: colors.red, padding: 12 }}
        >
          {error}
        </Text>
      )}
      {ready && !state.loginPromptDismissed ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 16 }}><AccountPanel onboarding /></ScrollView>
      ) : ready ? (
        <>
          <RestNotifications />
          {pathname !== '/workout' && (
            <View style={{ paddingHorizontal: 18, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line }}>
              <Text style={styles.body} accessibilityLabel={`筋トレレベル${level}、累計${trainingDays}日`}>
                Lv{level}　累計トレーニング {trainingDays.toLocaleString('ja-JP')}日
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bg },
              }}
            />
            <TrainingDock />
          </View>
        </>
      ) : (
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.small}>読み込み中…</Text>
        </View>
      )}
    </SafeAreaView>
  );
}
