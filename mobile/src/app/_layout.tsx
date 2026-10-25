import { Stack } from 'expo-router';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppProvider, useApp } from '../context';
import { ThemeProvider, useTheme } from '../ui';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { TrainingDock } from '../components/TrainingDock';
import { RestNotifications } from '../rest-notifications';

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
  const { ready, error } = useApp();
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
      {ready ? (
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
