import { View, Text, FlatList, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Package } from 'lucide-react-native';
import { useKitchenStore } from '@/store/kitchen-store';
import { useDeliveryStore } from '@/store/delivery-store';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/feedback/EmptyState';
import type { BadgeVariant } from '@/components/ui/StatusBadge';
import type { DeliveryStatus } from '@/domain/models/delivery';

const STATUS_VARIANT: Record<DeliveryStatus, BadgeVariant> = {
  pending: 'warning',
  in_progress: 'info',
  completed: 'success',
};

const STATUS_LABEL: Record<DeliveryStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
};

export default function ReceivingIndexScreen() {
  const insets = useSafeAreaInsets();
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  const deliveries = useDeliveryStore((s) => s.deliveries).filter(
    (d) => d.kitchenId === activeKitchen?.id,
  );

  const pending = deliveries.filter((d) => d.status !== 'completed');
  const completed = deliveries.filter((d) => d.status === 'completed');

  return (
    <View className="flex-1 bg-surface-900" style={{ paddingTop: insets.top }}>
      <View className="px-4 py-3 border-b border-surface-800">
        <Text className="text-white text-lg font-bold">Receiving</Text>
        {activeKitchen ? (
          <Text className="text-surface-400 text-xs">{activeKitchen.name}</Text>
        ) : null}
      </View>

      <FlatList
        data={[...pending, ...completed]}
        keyExtractor={(d) => d.id}
        contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 32 }}
        ListHeaderComponent={
          pending.length > 0 ? (
            <Text className="text-surface-400 text-xs font-semibold uppercase tracking-wider mb-1">
              Expected Deliveries
            </Text>
          ) : null
        }
        renderItem={({ item: delivery }) => (
          <Pressable
            onPress={() => router.push(`/(app)/receiving/${delivery.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`Open delivery from ${delivery.supplierName}`}
            className="bg-surface-800 rounded-xl p-4 active:opacity-70"
          >
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-2">
                <Package size={16} color="#B3B0A6" strokeWidth={1.75} />
                <Text className="text-white font-semibold">{delivery.supplierName}</Text>
              </View>
              <StatusBadge
                label={STATUS_LABEL[delivery.status]}
                variant={STATUS_VARIANT[delivery.status]}
              />
            </View>
            <Text className="text-surface-400 text-sm">
              {delivery.lineItems.length} item{delivery.lineItems.length > 1 ? 's' : ''}
              {delivery.scheduledAt
                ? ` · Expected ${new Date(delivery.scheduledAt).toLocaleDateString()}`
                : ''}
            </Text>
            {delivery.completedAt && (
              <Text className="text-surface-500 text-xs mt-1">
                Completed {new Date(delivery.completedAt).toLocaleDateString()}
              </Text>
            )}
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState
            title="No deliveries"
            description="Expected deliveries will appear here when orders are confirmed."
          />
        }
      />
    </View>
  );
}
