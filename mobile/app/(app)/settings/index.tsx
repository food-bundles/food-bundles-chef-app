import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Switch, Pressable, ScrollView, Alert, Linking, AppState, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, BellOff, ChevronLeft, ChevronRight, Shield, Globe, Moon, Sun, MessageSquare, RefreshCw, LogOut, Trash2 } from 'lucide-react-native';
import { colors } from '@/lib/theme';
import { router } from 'expo-router';
import { useSessionStore } from '@/store/session-store';
import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
  scheduleDailyLowStockReminder,
  cancelDailyLowStockReminder,
  type NotificationPermissionStatus,
} from '@/services/notifications';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const signOut = useSessionStore((s) => s.signOut);
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

  // Re-check permission when user returns from device settings (#19)
  const appStateRef = useRef(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current !== 'active' && nextState === 'active') {
        void refreshPermStatus();
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [refreshPermStatus]);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/welcome');
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all kitchen data. This action cannot be undone.\n\nTo proceed, contact support@foodbundles.rw.',
      [{ text: 'OK', style: 'default' }],
    );
  };

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
          <ChevronLeft size={24} color={colors.surface[400]} strokeWidth={2} />
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
                <Bell size={20} color={colors.brand[500]} strokeWidth={2} />
              ) : (
                <BellOff size={20} color={colors.surface[400]} strokeWidth={2} />
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
              trackColor={{ false: colors.surface[700], true: colors.brand[500] }}
              thumbColor={dailyReminderEnabled ? colors.white : colors.surface[400]}
              accessibilityLabel="Daily stock reminder toggle"
              accessibilityRole="switch"
              accessibilityState={{ checked: dailyReminderEnabled }}
            />
          </View>
        </View>

        {permStatus === 'denied' && (
          <View className="bg-warning/10 border border-warning/30 rounded-xl p-4 gap-3">
            <Text className="text-warning text-sm font-medium">Notifications blocked</Text>
            <Text className="text-surface-700 dark:text-surface-300 text-sm">
              Notifications are blocked for this app. Tap below to open your device settings and enable them.
            </Text>
            <Pressable
              onPress={() => void Linking.openSettings()}
              accessibilityRole="button"
              accessibilityLabel="Open device settings to enable notifications"
              className="bg-warning rounded-lg px-4 py-2.5 self-start active:opacity-80"
            >
              <Text className="text-white font-semibold text-sm">Open Settings</Text>
            </Pressable>
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
            <Globe size={18} color={colors.brand[500]} strokeWidth={2} />
            <View className="flex-1">
              <Text className="text-surface-900 dark:text-white font-medium">Manage Kitchens</Text>
              <Text className="text-surface-600 dark:text-surface-400 text-sm mt-0.5">Add, switch or archive kitchens</Text>
            </View>
            <ChevronRight size={16} color={colors.surface[400]} strokeWidth={2} />
          </Pressable>
          <Pressable
            onPress={() => Alert.alert('Sync', 'Syncing your kitchen data…')}
            accessibilityRole="button"
            accessibilityLabel="Sync now"
            className="px-4 py-4 flex-row items-center gap-3 active:opacity-70"
          >
            <RefreshCw size={18} color={colors.surface[500]} strokeWidth={2} />
            <View className="flex-1">
              <Text className="text-surface-900 dark:text-white font-medium">Sync Data</Text>
              <Text className="text-surface-600 dark:text-surface-400 text-sm mt-0.5">Force a full data refresh</Text>
            </View>
            <ChevronRight size={16} color={colors.surface[400]} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Appearance */}
        <Text className="text-surface-600 dark:text-surface-400 text-xs font-semibold uppercase tracking-wider px-1 mt-2">
          Appearance
        </Text>
        <View className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl overflow-hidden">
          <View className="px-4 py-4 flex-row items-center gap-3">
            {isDark ? (
              <Moon size={18} color={colors.brand[500]} strokeWidth={2} />
            ) : (
              <Sun size={18} color={colors.brand[500]} strokeWidth={2} />
            )}
            <View className="flex-1">
              <Text className="text-surface-900 dark:text-white font-medium">Theme</Text>
              <Text className="text-surface-600 dark:text-surface-400 text-sm mt-0.5">
                {isDark ? 'Dark mode active' : 'Light mode active'} · follows system setting
              </Text>
            </View>
          </View>
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
            <MessageSquare size={18} color={colors.surface[500]} strokeWidth={2} />
            <View className="flex-1">
              <Text className="text-surface-900 dark:text-white font-medium">Contact Support</Text>
              <Text className="text-surface-600 dark:text-surface-400 text-sm mt-0.5">support@foodbundles.rw</Text>
            </View>
            <ChevronRight size={16} color={colors.surface[400]} strokeWidth={2} />
          </Pressable>
          <Pressable
            onPress={() => Linking.openURL('https://foodbundles.rw/privacy')}
            accessibilityRole="button"
            accessibilityLabel="Privacy policy"
            className="px-4 py-4 flex-row items-center gap-3 active:opacity-70"
          >
            <Shield size={18} color={colors.surface[500]} strokeWidth={2} />
            <View className="flex-1">
              <Text className="text-surface-900 dark:text-white font-medium">Privacy Policy</Text>
              <Text className="text-surface-600 dark:text-surface-400 text-sm mt-0.5">How we handle your data</Text>
            </View>
            <ChevronRight size={16} color={colors.surface[400]} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Account */}
        <Text className="text-surface-600 dark:text-surface-400 text-xs font-semibold uppercase tracking-wider px-1 mt-2">
          Account
        </Text>
        <View className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl overflow-hidden">
          <Pressable
            onPress={handleSignOut}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            className="px-4 py-4 flex-row items-center gap-3 border-b border-surface-200 dark:border-surface-700 active:opacity-70"
          >
            <View className="w-8 h-8 rounded-lg bg-surface-100 dark:bg-surface-700 items-center justify-center">
              <LogOut size={16} color={colors.danger} strokeWidth={2} />
            </View>
            <Text className="flex-1 text-red-600 font-medium">Sign Out</Text>
          </Pressable>
          <Pressable
            onPress={handleDeleteAccount}
            accessibilityRole="button"
            accessibilityLabel="Delete account"
            className="px-4 py-4 flex-row items-center gap-3 active:opacity-70"
          >
            <View className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/30 items-center justify-center">
              <Trash2 size={16} color={colors.danger} strokeWidth={2} />
            </View>
            <View className="flex-1">
              <Text className="text-red-600 font-medium">Delete Account</Text>
              <Text className="text-surface-500 text-xs mt-0.5">Permanently remove all data</Text>
            </View>
          </Pressable>
        </View>

        {/* Footer wordmark */}
        <View className="items-center pt-2 pb-2 gap-1">
          <Text className="text-surface-900 dark:text-white text-xs font-bold uppercase tracking-widest">
            Food Bundles Chef
          </Text>
          <Text className="text-surface-400 dark:text-surface-600 text-[10px]">
            Built for professional kitchen teams
          </Text>
          <Text className="text-surface-300 dark:text-surface-800 text-[9px]">
            © Food Bundles · foodbundles.rw
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
