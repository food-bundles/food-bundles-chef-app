import { View, Text, Pressable, ScrollView, RefreshControl } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, ChevronRight, Plus, UtensilsCrossed } from 'lucide-react-native';
import { useKitchenStore } from '@/store/kitchen-store';
import { useKitchens } from '@/features/kitchens/useKitchens';
import type { Kitchen } from '@/domain/models/kitchen';

export default function KitchensScreen() {
  const insets = useSafeAreaInsets();
  const kitchens = useKitchenStore((s) => s.kitchens);
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  const setActiveKitchen = useKitchenStore((s) => s.setActiveKitchen);
  const { refetch } = useKitchens();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const activeKitchens = kitchens.filter((k) => !k.isArchived);
  const archivedKitchens = kitchens.filter((k) => k.isArchived);

  const handleSelect = (kitchen: Kitchen) => {
    setActiveKitchen(kitchen);
  };

  const handleEdit = (kitchen: Kitchen) => {
    router.push(`/(app)/kitchens/${kitchen.id}`);
  };

  return (
    <View className="flex-1 bg-surface-50 dark:bg-surface-900" style={{ paddingTop: insets.top }}>
      <View className="px-4 py-3 flex-row items-center justify-between border-b border-surface-200 dark:border-surface-800">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text className="text-surface-700 dark:text-surface-300 text-2xl">←</Text>
          </Pressable>
          <Text className="text-surface-900 dark:text-white text-lg font-bold">My Kitchens</Text>
        </View>
        <Pressable
          onPress={() => router.push('/(app)/kitchens/create')}
          accessibilityRole="button"
          accessibilityLabel="Add kitchen"
          className="w-10 h-10 items-center justify-center rounded-xl bg-brand-500"
        >
          <Plus size={20} color="#fff" strokeWidth={2.5} />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0E8438" colors={['#0E8438']} />
        }
      >
        <Text className="text-surface-600 dark:text-surface-400 text-xs font-semibold uppercase tracking-wider mb-1">
          Active Kitchens
        </Text>

        {activeKitchens.map((kitchen) => {
          const isActive = kitchen.id === activeKitchen?.id;
          const initials = kitchen.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
          return (
            <Pressable
              key={kitchen.id}
              onPress={() => handleSelect(kitchen)}
              accessibilityRole="button"
              accessibilityLabel={`Select ${kitchen.name}`}
              className={`bg-white dark:bg-surface-800 rounded-xl p-4 flex-row items-center gap-3 active:opacity-70 ${isActive ? 'border-2 border-brand-500' : 'border border-surface-200 dark:border-transparent'}`}
            >
              {/* Kitchen avatar */}
              <View className={`w-12 h-12 rounded-xl items-center justify-center ${isActive ? 'bg-brand-500' : 'bg-brand-500/10'}`}>
                <UtensilsCrossed size={22} color={isActive ? '#fff' : '#0E8438'} strokeWidth={1.75} />
              </View>

              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-surface-900 dark:text-white font-semibold text-sm">{kitchen.name}</Text>
                  {isActive && (
                    <View className="bg-brand-500/15 rounded-full px-2 py-0.5">
                      <Text className="text-brand-400 text-[10px] font-bold uppercase tracking-wide">Active</Text>
                    </View>
                  )}
                </View>
                {kitchen.cuisineType ? (
                  <Text className="text-surface-500 text-xs mt-0.5">{kitchen.cuisineType}</Text>
                ) : null}
                {kitchen.address ? (
                  <Text className="text-surface-500 text-xs mt-0.5" numberOfLines={1}>{kitchen.address}</Text>
                ) : null}
                {!kitchen.cuisineType && !kitchen.address ? (
                  <Text className="text-surface-400 text-xs mt-0.5">Tap to set as active kitchen</Text>
                ) : null}
              </View>

              <Pressable
                onPress={() => handleEdit(kitchen)}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${kitchen.name}`}
                hitSlop={8}
                className="p-2 rounded-lg bg-surface-100 dark:bg-surface-700"
              >
                <ChevronRight size={16} color="#6B6860" strokeWidth={1.75} />
              </Pressable>
            </Pressable>
          );
        })}

        {activeKitchens.length === 0 && (
          <View className="items-center py-12 gap-3">
            <View className="w-16 h-16 rounded-full bg-brand-500/10 items-center justify-center">
              <UtensilsCrossed size={28} color="#0E8438" strokeWidth={1.5} />
            </View>
            <Text className="text-surface-900 dark:text-white font-semibold text-base">No kitchens yet</Text>
            <Text className="text-surface-500 text-sm text-center">Create your first kitchen to start managing stock, menus, and deliveries.</Text>
            <Pressable
              onPress={() => router.push('/(app)/kitchens/create')}
              accessibilityRole="button"
              className="bg-brand-500 rounded-xl px-6 py-3 mt-1 active:opacity-80"
            >
              <Text className="text-white font-semibold">Create Kitchen</Text>
            </Pressable>
          </View>
        )}

        {archivedKitchens.length > 0 && (
          <>
            <Text className="text-surface-600 dark:text-surface-400 text-xs font-semibold uppercase tracking-wider mt-4 mb-1">
              Archived
            </Text>
            {archivedKitchens.map((kitchen) => (
              <Pressable
                key={kitchen.id}
                onPress={() => handleEdit(kitchen)}
                accessibilityRole="button"
                accessibilityLabel={`Edit archived kitchen ${kitchen.name}`}
                className="bg-surface-100 dark:bg-surface-800/50 rounded-xl p-4 flex-row items-center gap-3 active:opacity-70 border border-surface-200 dark:border-surface-700"
              >
                <View className="w-12 h-12 rounded-xl items-center justify-center bg-surface-200 dark:bg-surface-700">
                  <UtensilsCrossed size={22} color="#B3B0A6" strokeWidth={1.75} />
                </View>
                <View className="flex-1">
                  <Text className="text-surface-500 font-medium text-sm">{kitchen.name}</Text>
                  <Text className="text-surface-400 text-xs mt-0.5">Archived</Text>
                </View>
                <ChevronRight size={16} color="#B3B0A6" strokeWidth={1.75} />
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
