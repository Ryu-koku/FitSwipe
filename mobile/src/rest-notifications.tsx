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

export async function prepareRestNotifications() {
  if (Platform.OS === 'web') return true;
  if (Platform.OS === 'android')
    await Notifications.setNotificationChannelAsync(channelId, {
      name: '休憩タイマー',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      enableVibrate: true,
      vibrationPattern: [0, 240],
    });
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && permission.canAskAgain)
    await Notifications.requestPermissionsAsync();
  if (Platform.OS === 'android') {
    const exact = await Notifications.getExactAlarmPermissionsAsync();
    if (!exact.granted) {
      const open = await new Promise<boolean>((resolve) =>
        Alert.alert(
          'バックグラウンドの休憩アラーム',
          '別のアプリを開いている時や画面が消えている時も休憩終了を知らせるには「アラームとリマインダー」の許可が必要です。設定後にトレーニングを開始します。',
          [
            {
              text: 'キャンセル',
              style: 'cancel',
              onPress: () => resolve(false),
            },
            { text: '設定を開く', onPress: () => resolve(true) },
          ],
          { cancelable: true, onDismiss: () => resolve(false) },
        ),
      );
      if (!open) return false;
      const result = await Notifications.requestExactAlarmPermissionsAsync();
      if (!result.granted) {
        Alert.alert(
          '休憩アラーム',
          '許可されていないためトレーニングを開始しませんでした',
        );
        return false;
      }
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
