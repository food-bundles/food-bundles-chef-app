import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKitchenStore } from '@/store/kitchen-store';

export default function KitchenDetailScreen() {
  const insets = useSafeAreaInsets();
  const { kitchenId } = useLocalSearchParams<{ kitchenId: string }>();
  const kitchen = useKitchenStore((s) => s.kitchens.find((k) => k.id === kitchenId));

  if (!kitchen) {
    return (
      <View className="flex-1 bg-surface-900 items-center justify-center">
        <Text className="text-surface-400">Kitchen not found.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-900" style={{ paddingTop: insets.top }}>
      <View className="px-4 py-3 border-b border-surface-800">
        <Text className="text-white text-lg font-bold">{kitchen.name}</Text>
      </View>
      <View className="px-4 py-6 gap-3">
        {kitchen.address && (
          <InfoRow label="Address" value={kitchen.address} />
        )}
        {kitchen.cuisineType && (
          <InfoRow label="Cuisine" value={kitchen.cuisineType} />
        )}
        {kitchen.seatingCapacity !== undefined && (
          <InfoRow label="Seating" value={`${kitchen.seatingCapacity} covers`} />
        )}
        <InfoRow label="Status" value={kitchen.isArchived ? 'Archived' : 'Active'} />
      </View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="bg-surface-800 rounded-xl p-4">
      <Text className="text-surface-400 text-xs font-medium uppercase tracking-wider mb-1">
        {label}
      </Text>
      <Text className="text-white">{value}</Text>
    </View>
  );
}
