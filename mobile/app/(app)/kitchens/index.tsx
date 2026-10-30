import { View, Text, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, ChevronRight, Plus } from 'lucide-react-native';
import { useKitchenStore } from '@/store/kitchen-store';
import type { Kitchen } from '@/domain/models/kitchen';

export default function KitchensScreen() {
  const insets = useSafeAreaInsets();
  const kitchens = useKitchenStore((s) => s.kitchens);
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  const setActiveKitchen = useKitchenStore((s) => s.setActiveKitchen);

  const activeKitchens = kitchens.filter((k) => !k.isArchived);

  const handleSelect = (kitchen: Kitchen) => {
    setActiveKitchen(kitchen);
  };

  const handleEdit = (kitchen: Kitchen) => {
    router.push(`/(app)/kitchens/${kitchen.id}`);
  };

  return (
    <View className="flex-1 bg-surface-900" style={{ paddingTop: insets.top }}>
      <View className="px-4 py-3 flex-row items-center justify-between border-b border-surface-800">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text className="text-surface-300 text-2xl">←</Text>
          </Pressable>
          <Text className="text-white text-lg font-bold">Kitchens</Text>
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
        contentContainerStyle={{ padding: 16, gap: 10 }}
      >
        <Text className="text-surface-400 text-xs font-semibold uppercase tracking-wider mb-2">
          Your Kitchens
        </Text>

        {activeKitchens.map((kitchen) => {
          const isActive = kitchen.id === activeKitchen?.id;
          return (
            <Pressable
              key={kitchen.id}
              onPress={() => handleSelect(kitchen)}
              accessibilityRole="button"
              accessibilityLabel={`Select ${kitchen.name}`}
              className={`bg-surface-800 rounded-xl p-4 flex-row items-center justify-between active:opacity-70 ${isActive ? 'border border-brand-500' : ''}`}
            >
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-white font-semibold">{kitchen.name}</Text>
                  {isActive && (
                    <CheckCircle size={14} color="#1DB954" strokeWidth={2} />
                  )}
                </View>
                {kitchen.address ? (
                  <Text className="text-surface-400 text-sm mt-0.5">{kitchen.address}</Text>
                ) : null}
                {kitchen.cuisineType ? (
                  <Text className="text-surface-500 text-xs mt-1">{kitchen.cuisineType}</Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => handleEdit(kitchen)}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${kitchen.name}`}
                hitSlop={8}
                className="p-1"
              >
                <ChevronRight size={16} color="#6B6860" strokeWidth={1.75} />
              </Pressable>
            </Pressable>
          );
        })}

        {activeKitchens.length === 0 && (
          <View className="items-center py-12">
            <Text className="text-surface-500 text-sm">No kitchens yet. Add your first kitchen.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
