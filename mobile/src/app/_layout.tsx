import { PremiumProvider } from '../premium-context';
import { Stack, usePathname } from 'expo-router';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppProvider, useApp } from '../context';
import { Button, ThemeProvider, useTheme } from '../ui';
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { TrainingDock } from '../components/TrainingDock';
import { RestNotifications } from '../rest-notifications';
import { AccountPanel } from '../components/AccountPanel';
import { shareTextFile } from '../data-transfer';

export default function Layout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <ThemeProvider>
          <PremiumProvider><AppLayout /></PremiumProvider>
        </ThemeProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}

function AppLayout() {
  const path = usePathname();
  const hasDock = ['/', '/prepare', '/rooms'].includes(path);
  const { ready, error, state, loadFailed } = useApp();
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
      {ready && !state.cloud && !state.loginPromptDismissed ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 16 }}><AccountPanel onboarding /></ScrollView>
      ) : ready ? (
        <>
          <RestNotifications />
          <View style={{ flex: 1 }}>
            <React.Profiler id="Stack" onRender={(id, phase, actualDuration) => { if (actualDuration > 2) console.log('[PERF] profiler', id, phase, `${actualDuration.toFixed(1)}ms`); }}> {/* // PERF-TEMP */}
            <Stack
              // Expo Router 58 ignores freezeOnBlur; hide the immediately covered route.
              activityEnabled={1}
              screenOptions={{
                headerShown: false,
                freezeOnBlur: true,
                contentStyle: { backgroundColor: colors.bg },
              }}
            />
            </React.Profiler> {/* // PERF-TEMP */}
            <React.Profiler id="TrainingDock" onRender={(id, phase, actualDuration) => { if (actualDuration > 2) console.log('[PERF] profiler', id, phase, `${actualDuration.toFixed(1)}ms`); }}> {/* // PERF-TEMP */}
            <TrainingDock />
            </React.Profiler> {/* // PERF-TEMP */}
          </View>
        </>
      ) : loadFailed ? (
        <LoadRecovery />
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

// The profile could not be read. Offer a copy of the stored data first; the
// reset removes only the main profile (account archives and the guest copy stay).
function LoadRecovery() {
  const { exportRawStorage, resetAfterLoadFailure } = useApp();
  const { styles } = useTheme();
  const [busy, setBusy] = React.useState(false);
  const run = async (work: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    try { await work(); }
    catch (error) { Alert.alert('操作できませんでした', error instanceof Error ? error.message : 'もう一度お試しください。'); }
    finally { setBusy(false); }
  };
  return <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 16 }}>
    <Button label="保存データを書き出す" secondary disabled={busy} onPress={() => void run(async () => shareTextFile('fitswipe-raw', 'json', await exportRawStorage()))} />
    <Button label="初期化して始め直す" disabled={busy} onPress={() => Alert.alert('初期化しますか？', 'この端末の記録を削除して初期状態から始めます。ログイン中だった場合は、再ログインでアカウントの記録を戻せます。取り消せません。', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '初期化', style: 'destructive', onPress: () => void run(resetAfterLoadFailure) },
    ])} />
    <Text style={styles.small}>初期化しても、ログイン前の保管データとアカウントごとの保管データは残ります。</Text>
  </ScrollView>;
}
