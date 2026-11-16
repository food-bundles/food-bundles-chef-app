import { View, Text, Pressable, ScrollView, RefreshControl } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Plus, UtensilsCrossed, MapPin } from 'lucide-react-native';
import { colors } from '@/lib/theme';
import { ListRow } from '@/components/ui/ListRow';
import { useKitchenStore } from '@/store/kitchen-store';
import { useKitchens } from '@/features/kitchens/useKitchens';
import type { Kitchen } from '@/domain/models/kitchen';

function ActiveBadge() {
  return (
    <View style={{ backgroundColor: colors.brand[50], borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Text style={{ color: colors.brand[500], fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Active
      </Text>
    </View>
  );
}

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
      {/* Header — #18: ChevronLeft back button */}
      <View className="px-4 py-3 flex-row items-center justify-between border-b border-surface-200 dark:border-surface-800">
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronLeft size={24} color={colors.surface[500]} strokeWidth={2} />
          </Pressable>
          <Text className="text-surface-900 dark:text-white text-lg font-bold">Your Kitchens</Text>
        </View>
        <Pressable
          onPress={() => router.push('/(app)/kitchens/create')}
          accessibilityRole="button"
          accessibilityLabel="Add kitchen"
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.brand[500] }}
        >
          <Plus size={20} color={colors.white} strokeWidth={2.5} />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />
        }
      >
        {/* #18: "Your kitchens" section heading */}
        <Text className="text-surface-600 dark:text-surface-400 text-xs font-semibold uppercase tracking-wider mb-1">
          Your kitchens
        </Text>

        {activeKitchens.length > 0 && (
          <View style={{ borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.surface[200] }}>
            {activeKitchens.map((kitchen, index) => {
              const isActive = kitchen.id === activeKitchen?.id;
              const hasLocation = Boolean(kitchen.cuisineType);
              const subtitle = kitchen.cuisineType ?? kitchen.address ?? 'Tap to set as active kitchen';
              return (
                <ListRow
                  key={kitchen.id}
                  icon={<UtensilsCrossed size={18} color={isActive ? colors.white : colors.brand[500]} strokeWidth={1.75} />}
                  iconBg={isActive ? colors.brand[500] : colors.brand[50]}
                  title={kitchen.name}
                  subtitle={subtitle}
                  trailing={
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {isActive && <ActiveBadge />}
                      {!hasLocation && (
                        <Pressable
                          onPress={() => router.push(`/(app)/kitchens/${kitchen.id}`)}
                          accessibilityRole="button"
                          accessibilityLabel={`Add location for ${kitchen.name}`}
                          hitSlop={8}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.warning + '20' }}
                        >
                          <MapPin size={12} color={colors.warning} strokeWidth={2} />
                          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.warning }}>Add location</Text>
                        </Pressable>
                      )}
                      <Pressable
                        onPress={() => handleEdit(kitchen)}
                        accessibilityRole="button"
                        accessibilityLabel={`Edit ${kitchen.name}`}
                        hitSlop={8}
                        style={{ padding: 6, borderRadius: 8, backgroundColor: colors.surface[100] }}
                      >
                        <ChevronRight size={16} color={colors.surface[500]} strokeWidth={1.75} />
                      </Pressable>
                    </View>
                  }
                  onPress={() => handleSelect(kitchen)}
                  accessibilityLabel={`${isActive ? 'Active kitchen' : 'Select kitchen'}: ${kitchen.name}`}
                  separator={index < activeKitchens.length - 1}
                />
              );
            })}
          </View>
        )}

        {activeKitchens.length === 0 && (
          <View className="items-center py-12 gap-3">
            <View className="w-16 h-16 rounded-full bg-brand-500/10 items-center justify-center">
              <UtensilsCrossed size={28} color={colors.brand[500]} strokeWidth={1.5} />
            </View>
            <Text className="text-surface-900 dark:text-white font-semibold text-base">No kitchens yet</Text>
            <Text className="text-surface-500 text-sm text-center">
              Create your first kitchen to start managing stock, menus, and deliveries.
            </Text>
            <Pressable
              onPress={() => router.push('/(app)/kitchens/create')}
              accessibilityRole="button"
              accessibilityLabel="Create kitchen"
              style={{ backgroundColor: colors.brand[500], borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 }}
            >
              <Text style={{ color: colors.white, fontWeight: '600' }}>Create Kitchen</Text>
            </Pressable>
          </View>
        )}

        {archivedKitchens.length > 0 && (
          <>
            <Text className="text-surface-600 dark:text-surface-400 text-xs font-semibold uppercase tracking-wider mt-4 mb-1">
              Archived
            </Text>
            <View style={{ borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.surface[200] }}>
              {archivedKitchens.map((kitchen, index) => (
                <ListRow
                  key={kitchen.id}
                  icon={<UtensilsCrossed size={18} color={colors.surface[400]} strokeWidth={1.75} />}
                  iconBg={colors.surface[100]}
                  title={kitchen.name}
                  subtitle="Archived"
                  trailing={<ChevronRight size={16} color={colors.surface[400]} strokeWidth={1.75} />}
                  onPress={() => handleEdit(kitchen)}
                  accessibilityLabel={`Edit archived kitchen: ${kitchen.name}`}
                  separator={index < archivedKitchens.length - 1}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
