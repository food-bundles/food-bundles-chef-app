import { useState, useEffect, useCallback } from 'react';
import { View, Text, Switch, Pressable, ScrollView, Alert, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, BellOff, ChevronLeft, ChevronRight, HelpCircle, Shield, Globe, Moon, MessageSquare, RefreshCw } from 'lucide-react-native';
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
                <Bell size={20} color="#0E8438" strokeWidth={2} />
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
              trackColor={{ false: '#374151', true: '#0E8438' }}
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

        {/* Kitchen preferences */}
        <Text className="text-surface-600 dark:text-surface-400 text-xs font-semibold uppercase tracking-wider px-1 mt-2">
          Kitchen
        </Text>
        <View className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl overflow-hidden">
          <Pressable
            onPress={() => router.push('/(app)/kitchens')}
            accessibilityRole="button"
            accessibilityLabel="Manage kitchens"
            className="px-4 py-4 flex-row items-center gap-3 border-b border-surface-200 dark:border-surface-700 active:opacity-70"
          >
            <Globe size={18} color="#0E8438" strokeWidth={2} />
            <View className="flex-1">
              <Text className="text-surface-900 dark:text-white font-medium">Manage Kitchens</Text>
              <Text className="text-surface-600 dark:text-surface-400 text-sm mt-0.5">Add, switch or archive kitchens</Text>
            </View>
            <ChevronRight size={16} color="#9CA3AF" strokeWidth={2} />
          </Pressable>
          <Pressable
            onPress={() => Alert.alert('Sync', 'Syncing your kitchen data…')}
            accessibilityRole="button"
            accessibilityLabel="Sync now"
            className="px-4 py-4 flex-row items-center gap-3 active:opacity-70"
          >
            <RefreshCw size={18} color="#6B6860" strokeWidth={2} />
            <View className="flex-1">
              <Text className="text-surface-900 dark:text-white font-medium">Sync Data</Text>
              <Text className="text-surface-600 dark:text-surface-400 text-sm mt-0.5">Force a full data refresh</Text>
            </View>
            <ChevronRight size={16} color="#9CA3AF" strokeWidth={2} />
          </Pressable>
        </View>

        {/* Support */}
        <Text className="text-surface-600 dark:text-surface-400 text-xs font-semibold uppercase tracking-wider px-1 mt-2">
          Support
        </Text>
        <View className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl overflow-hidden">
          <Pressable
            onPress={() => Linking.openURL('mailto:support@foodbundles.rw')}
            accessibilityRole="button"
            accessibilityLabel="Contact support"
            className="px-4 py-4 flex-row items-center gap-3 border-b border-surface-200 dark:border-surface-700 active:opacity-70"
          >
            <MessageSquare size={18} color="#6B6860" strokeWidth={2} />
            <View className="flex-1">
              <Text className="text-surface-900 dark:text-white font-medium">Contact Support</Text>
              <Text className="text-surface-600 dark:text-surface-400 text-sm mt-0.5">support@foodbundles.rw</Text>
            </View>
            <ChevronRight size={16} color="#9CA3AF" strokeWidth={2} />
          </Pressable>
          <Pressable
            onPress={() => Linking.openURL('https://foodbundles.rw/privacy')}
            accessibilityRole="button"
            accessibilityLabel="Privacy policy"
            className="px-4 py-4 flex-row items-center gap-3 active:opacity-70"
          >
            <Shield size={18} color="#6B6860" strokeWidth={2} />
            <View className="flex-1">
              <Text className="text-surface-900 dark:text-white font-medium">Privacy Policy</Text>
              <Text className="text-surface-600 dark:text-surface-400 text-sm mt-0.5">How we handle your data</Text>
            </View>
            <ChevronRight size={16} color="#9CA3AF" strokeWidth={2} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
