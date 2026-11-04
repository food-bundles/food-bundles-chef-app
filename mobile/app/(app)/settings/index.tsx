import { useState, useEffect, useCallback } from 'react';
import { View, Text, Switch, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, BellOff, ChevronLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
  scheduleDailyLowStockReminder,
  cancelDailyLowStockReminder,
  type NotificationPermissionStatus,
} from '@/services/notifications';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [permStatus, setPermStatus] = useState<NotificationPermissionStatus>('undetermined');
  const [dailyReminderEnabled, setDailyReminderEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  const refreshPermStatus = useCallback(async () => {
    const status = await getNotificationPermissionStatus();
    setPermStatus(status);
  }, []);

  useEffect(() => {
    void refreshPermStatus();
  }, [refreshPermStatus]);

  const handleRequestPermission = async () => {
    setLoading(true);
    const status = await requestNotificationPermission();
    setPermStatus(status);
    setLoading(false);
  };

  const handleDailyReminderToggle = async (value: boolean) => {
    setDailyReminderEnabled(value);
    if (value) {
      await scheduleDailyLowStockReminder(7, 0);
    } else {
      await cancelDailyLowStockReminder();
    }
  };

  return (
    <View className="flex-1 bg-surface-50 dark:bg-surface-900" style={{ paddingTop: insets.top }}>
      <View className="px-4 py-3 border-b border-surface-200 dark:border-surface-800 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={24} color="#9CA3AF" strokeWidth={2} />
        </Pressable>
        <Text className="text-surface-900 dark:text-white text-lg font-bold">Settings</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Notifications section */}
        <Text className="text-surface-600 dark:text-surface-400 text-xs font-semibold uppercase tracking-wider px-1">
          Notifications
        </Text>

        <View className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl overflow-hidden">
          {/* Permission row */}
          <View className="px-4 py-4 flex-row items-center justify-between border-b border-surface-200 dark:border-surface-700">
            <View className="flex-row items-center gap-3 flex-1">
              {permStatus === 'granted' ? (
                <Bell size={20} color="#1DB954" strokeWidth={2} />
              ) : (
                <BellOff size={20} color="#9CA3AF" strokeWidth={2} />
              )}
              <View className="flex-1">
                <Text className="text-surface-900 dark:text-white font-medium">Push Notifications</Text>
                <Text className="text-surface-600 dark:text-surface-400 text-sm mt-0.5">
                  {permStatus === 'granted'
                    ? 'Enabled'
                    : permStatus === 'denied'
                    ? 'Denied — change in system settings'
                    : 'Not yet enabled'}
                </Text>
              </View>
            </View>
            {permStatus !== 'granted' && permStatus !== 'denied' && (
              <Pressable
                onPress={handleRequestPermission}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="Enable notifications"
                className="bg-brand-500 rounded-lg px-3 py-1.5 active:opacity-80"
              >
                <Text className="text-white text-sm font-semibold">Enable</Text>
              </Pressable>
            )}
          </View>

          {/* Daily reminder row */}
          <View className="px-4 py-4 flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <Text className="text-surface-900 dark:text-white font-medium">Daily Stock Reminder</Text>
              <Text className="text-surface-600 dark:text-surface-400 text-sm mt-0.5">
                Reminder at 7:00 AM to review low-stock ingredients
              </Text>
            </View>
            <Switch
              value={dailyReminderEnabled}
              onValueChange={handleDailyReminderToggle}
              disabled={permStatus !== 'granted'}
              trackColor={{ false: '#374151', true: '#1DB954' }}
              thumbColor={dailyReminderEnabled ? '#ffffff' : '#9CA3AF'}
              accessibilityLabel="Daily stock reminder toggle"
              accessibilityRole="switch"
              accessibilityState={{ checked: dailyReminderEnabled }}
            />
          </View>
        </View>

        {permStatus === 'denied' && (
          <View className="bg-warning/10 border border-warning/30 rounded-xl p-4">
            <Text className="text-warning text-sm font-medium mb-1">Notifications blocked</Text>
            <Text className="text-surface-700 dark:text-surface-300 text-sm">
              Open your device Settings → Food Bundles Chef → Notifications and enable them there.
            </Text>
          </View>
        )}

        {/* App info section */}
        <Text className="text-surface-600 dark:text-surface-400 text-xs font-semibold uppercase tracking-wider px-1 mt-2">
          App
        </Text>
        <View className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl px-4 py-4">
          <View className="flex-row justify-between">
            <Text className="text-surface-600 dark:text-surface-400 text-sm">Version</Text>
            <Text className="text-surface-900 dark:text-white text-sm">1.0.0 (Phase 08)</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
