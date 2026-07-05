import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

// Display notifications that arrive while the app is foregrounded; without a
// handler they are silently dropped.
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Routes notification taps. The send-push Edge Function attaches
 * `data: { task_id }` (per-task) or `data: { due_date }` (daily summary);
 * both land on the Tasks screen.
 */
export function useNotificationObserver() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'web') return;

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'Garden reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
      }).catch((err) => console.warn('[notifications] channel setup failed:', err));
    }

    function routeFromResponse(response: Notifications.NotificationResponse | null) {
      const data = response?.notification.request.content.data;
      if (!data) return;
      if ('task_id' in data || 'due_date' in data) {
        router.push('/tasks');
      }
    }

    // Cold start: the tap that launched the app.
    Notifications.getLastNotificationResponseAsync()
      .then(routeFromResponse)
      .catch(() => {});

    // Warm taps while the app is running or backgrounded.
    const subscription =
      Notifications.addNotificationResponseReceivedListener(routeFromResponse);
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
