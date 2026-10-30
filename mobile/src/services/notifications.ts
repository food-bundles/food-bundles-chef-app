import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/** Configure how notifications appear when the app is in the foreground */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined';

/**
 * Request notification permissions from the OS.
 * iOS: shows a prompt on first call.
 * Android 13+: requires POST_NOTIFICATIONS at runtime.
 * Returns the resolved status.
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (Platform.OS === 'web') return 'denied';

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return 'granted';

  const { status } = await Notifications.requestPermissionsAsync();
  return status as NotificationPermissionStatus;
}

export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  if (Platform.OS === 'web') return 'denied';
  const { status } = await Notifications.getPermissionsAsync();
  return status as NotificationPermissionStatus;
}

/** Schedule a local notification to appear immediately */
export async function scheduleLocalNotification(opts: {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: opts.title,
      body: opts.body,
      data: opts.data ?? {},
    },
    trigger: null, // fire immediately
  });
}

/** Schedule a daily low-stock reminder */
export async function scheduleDailyLowStockReminder(hour = 7, minute = 0): Promise<string> {
  // Cancel any existing daily reminder first
  await cancelDailyLowStockReminder();
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Stock Check',
      body: 'Review your low-stock ingredients before service starts.',
      data: { type: 'low-stock-reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

const DAILY_REMINDER_CATEGORY = 'low-stock-reminder';

export async function cancelDailyLowStockReminder(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => (n.content.data as Record<string, unknown>)?.type === DAILY_REMINDER_CATEGORY)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/** Send a delivery-ready local notification */
export async function notifyDeliveryReady(supplierName: string): Promise<void> {
  const status = await getNotificationPermissionStatus();
  if (status !== 'granted') return;
  await scheduleLocalNotification({
    title: 'Delivery Ready',
    body: `Your delivery from ${supplierName} is awaiting receiving.`,
    data: { type: 'delivery-ready', supplierName },
  });
}

/** Send a low-stock alert notification */
export async function notifyLowStock(ingredientCount: number): Promise<void> {
  const status = await getNotificationPermissionStatus();
  if (status !== 'granted') return;
  await scheduleLocalNotification({
    title: 'Low Stock Alert',
    body: `${ingredientCount} ingredient${ingredientCount > 1 ? 's are' : ' is'} running low. Check your purchase list.`,
    data: { type: 'low-stock', count: ingredientCount },
  });
}
