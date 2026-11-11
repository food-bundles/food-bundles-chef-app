/**
 * Notification service — stubbed until Firebase (google-services.json) is
 * configured. expo-notifications requires Firebase on Android; without it
 * the WorkManagerInitializer ContentProvider crashes the app at startup.
 *
 * To re-enable:
 *   1. Create a Firebase project and download google-services.json
 *   2. Add google-services.json to mobile/android/app/
 *   3. Re-add expo-notifications to package.json and app.json plugins
 *   4. Replace this file with the full implementation
 */

export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined';

export function initNotificationHandler(): void {
  // no-op until Firebase is configured
}

export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  return 'denied';
}

export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  return 'denied';
}

export async function scheduleLocalNotification(_opts: {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<string> {
  return '';
}

export async function scheduleDailyLowStockReminder(_hour = 7, _minute = 0): Promise<string> {
  return '';
}

export async function cancelDailyLowStockReminder(): Promise<void> {
  // no-op
}

export async function notifyDeliveryReady(_supplierName: string): Promise<void> {
  // no-op
}

export async function notifyLowStock(_ingredientCount: number): Promise<void> {
  // no-op
}
