import { useEffect, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { useApp } from './context';

const identifier = 'fitswipe-rest';
const channelId = 'rest-timer';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Exact alarms are recommended, not required: without them Android still
// delivers the rest alarm, possibly a little late. Never block training on it.
export async function prepareRestNotifications({ resume = false } = {}) {
  if (Platform.OS === 'web') return true;
  if (Platform.OS === 'android')
    await Notifications.setNotificationChannelAsync(channelId, {
      name: '休憩タイマー',
      importance: AndroidImportance.HIGH,
      // Omit sound to use Android's system default. A string here is
      // validated as a bundled custom sound filename in Expo SDK 58.
      enableVibrate: true,
      vibrationPattern: [0, 240],
    });
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && permission.canAskAgain)
    await Notifications.requestPermissionsAsync();
  if (Platform.OS === 'android' && !resume) {
    const exact = await Notifications.getExactAlarmPermissionsAsync();
    if (!exact.granted) {
      const choice = await new Promise<'cancel' | 'start' | 'settings'>((resolve) =>
        Alert.alert(
          'バックグラウンドの休憩アラーム',
          '別のアプリを開いている時や画面が消えている時も休憩終了を時間どおりに知らせるには「アラームとリマインダー」の許可をおすすめします。許可しない場合、通知が少し遅れることがあります。',
          [
            { text: 'キャンセル', style: 'cancel', onPress: () => resolve('cancel') },
            { text: 'このまま開始', onPress: () => resolve('start') },
            { text: '設定を開く', onPress: () => resolve('settings') },
          ],
          { cancelable: true, onDismiss: () => resolve('cancel') },
        ),
      );
      if (choice === 'cancel') return false;
      if (choice === 'settings') await Notifications.requestExactAlarmPermissionsAsync();
    }
  }
  return true;
}

// The OS delivers the alarm; React's interval is only for the visible countdown.
export function RestNotifications() {
  const { state } = useApp();
  const endsAt = state.workout?.restEndsAt;
  const latest = useRef(endsAt);
  useEffect(() => {
    latest.current = endsAt;
  }, [endsAt]);
  const queue = useRef(Promise.resolve());
  useEffect(() => {
    if (Platform.OS === 'web') return;
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        await Notifications.cancelScheduledNotificationAsync(identifier);
        if (!endsAt || endsAt <= Date.now() || latest.current !== endsAt)
          return;
        await Notifications.scheduleNotificationAsync({
          identifier,
          content: {
            title: '休憩終了',
            body: '次のセットを始めましょう',
            sound: 'default',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(endsAt),
            channelId,
            delivery: 'alarmClock',
          },
        });
      })
      .catch(() => {
        Alert.alert(
          '休憩通知',
          '通知を設定できませんでした。端末の通知設定を確認してください。',
        );
      });
  }, [endsAt]);
  return null;
}
