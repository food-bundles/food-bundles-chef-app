import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { router } from 'expo-router';
import { Settings } from 'lucide-react-native';
import { useSessionStore } from '@/store/session-store';
import { useKitchenStore } from '@/store/kitchen-store';
import { getMe } from '@/api/auth-api';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const chef = useSessionStore((s) => s.chef);
  const updateChef = useSessionStore((s) => s.updateChef);
  const signOut = useSessionStore((s) => s.signOut);
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);

  // Session restore only saves chef ID — fetch full profile if phone is missing.
  useEffect(() => {
    if (chef && !chef.phoneNumber) {
      getMe().then((profile) => {
        updateChef({ id: profile.id, phoneNumber: profile.phone_number, name: profile.name });
      }).catch(() => {});
    }
  }, [chef?.id]);

  const handleSignOut = () => {
    signOut();
    router.replace('/(auth)/welcome');
  };

  return (
    <View className="flex-1 bg-surface-50 dark:bg-surface-900" style={{ paddingTop: insets.top }}>
      <View className="px-4 py-3 border-b border-surface-200 dark:border-surface-800 flex-row items-center justify-between">
        <Text className="text-surface-900 dark:text-white text-lg font-bold">Profile</Text>
        <Pressable
          onPress={() => router.push('/(app)/settings')}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Settings size={20} color="#9CA3AF" strokeWidth={2} />
        </Pressable>
      </View>

      <View className="px-4 py-6 gap-4">
        <View className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl p-4">
          <Text className="text-surface-600 dark:text-surface-400 text-xs font-medium uppercase tracking-wider mb-1">
            Phone
          </Text>
          <Text className="text-surface-900 dark:text-white font-medium">{chef?.phoneNumber ?? '—'}</Text>
        </View>

        <View className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl p-4">
          <Text className="text-surface-600 dark:text-surface-400 text-xs font-medium uppercase tracking-wider mb-1">
            Active Kitchen
          </Text>
          <Text className="text-surface-900 dark:text-white font-medium">{activeKitchen?.name ?? 'None selected'}</Text>
          <Pressable
            onPress={() => router.push('/(app)/kitchens')}
            accessibilityRole="button"
            accessibilityLabel="Manage kitchens"
            className="mt-3 border-t border-surface-100 dark:border-surface-700 pt-3 flex-row items-center justify-between active:opacity-70"
          >
            <Text className="text-brand-400 text-sm font-medium">Manage Kitchens</Text>
            <Text className="text-brand-400 text-base">›</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(app)/receiving')}
            accessibilityRole="button"
            accessibilityLabel="Receiving"
            className="mt-2 border-t border-surface-100 dark:border-surface-700 pt-3 flex-row items-center justify-between active:opacity-70"
          >
            <Text className="text-brand-400 text-sm font-medium">Delivery Receiving</Text>
            <Text className="text-brand-400 text-base">›</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={handleSignOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          className="bg-danger/10 border border-danger/30 rounded-xl p-4 items-center active:opacity-80"
        >
          <Text className="text-danger font-semibold">Sign Out</Text>
        </Pressable>
      </View>
    </View>
  );
}
