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
  const path = usePathname();
  const hasDock = ['/', '/prepare', '/rooms'].includes(path);
  const { ready, error, state } = useApp();
  const { colors, styles, isDark } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: hasDock ? colors.surface : colors.bg }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {error && (
        <Text
          accessibilityRole="alert"
          style={{ color: colors.red, padding: 12 }}
        >
          {error}
        </Text>
      )}
      {ready && !state.cloud ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 16 }}><AccountPanel onboarding /></ScrollView>
      ) : ready ? (
        <>
          <RestNotifications />
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
