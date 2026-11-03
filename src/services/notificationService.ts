import { useNotificationsStore } from '@/stores';
import type { AppNotification, NotificationChannel } from '@/mocks/types';

type NotificationDraft = Omit<AppNotification, 'id' | 'read' | 'timestamp'>;

// Safely load expo-notifications — not available as native module in Expo Go SDK 58+
let Notifications: typeof import('expo-notifications') | null = null;
try {
  Notifications = require('expo-notifications');
  Notifications!.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
} catch {
  // Running in Expo Go — push notifications unavailable, local-only mode
}

function generateNotificationId(): string {
  return `NOTIF-${Date.now()}-${Math.round(Math.random() * 1000)}`;
}

export async function requestPermissions(): Promise<boolean> {
  if (!Notifications) return false;
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  const result = await Notifications.requestPermissionsAsync();
  return result.granted;
}

export async function scheduleLocalNotification(payload: NotificationDraft): Promise<string> {
  const id = generateNotificationId();
  const timestamp = new Date().toISOString();
  const channelEnabled = useNotificationsStore.getState().channelPrefs[payload.channel];

  if (Notifications && channelEnabled) {
    await Notifications.scheduleNotificationAsync({
      content: { title: payload.title, body: payload.body },
      trigger: null,
    });
  }

  useNotificationsStore.getState().addNotification({ ...payload, id, timestamp, read: false });
  return id;
}

export async function scheduleDelayedNotification(payload: NotificationDraft, delaySeconds: number): Promise<string> {
  const id = generateNotificationId();
  const timestamp = new Date().toISOString();
  const channelEnabled = useNotificationsStore.getState().channelPrefs[payload.channel];

  if (Notifications && channelEnabled) {
    await Notifications.scheduleNotificationAsync({
      content: { title: payload.title, body: payload.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: delaySeconds },
    });
  }

  useNotificationsStore.getState().addNotification({ ...payload, id, timestamp, read: false });
  return id;
}

export async function cancelNotification(id: string): Promise<void> {
  await Notifications?.cancelScheduledNotificationAsync(id);
}

export function setPriceAlert(productId: string, thresholdRwf: number, direction: 'above' | 'below'): void {
  useNotificationsStore.getState().setPriceAlert(productId, thresholdRwf, direction);
}

export type { NotificationChannel, AppNotification };
