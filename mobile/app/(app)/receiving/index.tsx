import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Package } from 'lucide-react-native';
import { useDeliveries } from '@/features/receiving/useDeliveries';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/feedback/EmptyState';
import type { OrderDto } from '@/api/orders-api';
import type { BadgeVariant } from '@/components/ui/StatusBadge';
import type { OrderStatus } from '@/api/orders-api';

const STATUS_VARIANT: Partial<Record<OrderStatus, BadgeVariant>> = {
  confirmed: 'warning',
  out_for_delivery: 'info',
  delivered: 'success',
};

const STATUS_LABEL: Partial<Record<OrderStatus, string>> = {
  confirmed: 'Pending',
  out_for_delivery: 'In Transit',
  delivered: 'Delivered',
};

export default function ReceivingIndexScreen() {
  const insets = useSafeAreaInsets();
  const { data: orders = [], isLoading, error } = useDeliveries();

  const pending = orders.filter((o) => o.status !== 'delivered');
  const completed = orders.filter((o) => o.status === 'delivered');

  return (
    <View className="flex-1 bg-surface-900" style={{ paddingTop: insets.top }}>
      <View className="px-4 py-3 border-b border-surface-800">
        <Text className="text-white text-lg font-bold">Receiving</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#A3A899" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-red-400 text-sm text-center">
            Could not load deliveries. Check your connection and try again.
          </Text>
        </View>
      ) : (
        <FlatList
          data={[...pending, ...completed]}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 32 }}
          ListHeaderComponent={
            pending.length > 0 ? (
              <Text className="text-surface-400 text-xs font-semibold uppercase tracking-wider mb-1">
                Expected Deliveries
              </Text>
            ) : undefined
          }
          renderItem={({ item: order }) => (
            <DeliveryRow order={order} />
          )}
          ListEmptyComponent={
            <EmptyState
              title="No deliveries"
              description="Expected deliveries will appear here when orders are confirmed."
            />
          }
        />
      )}
    </View>
  );
}

function DeliveryRow({ order }: { order: OrderDto }) {
  const label = STATUS_LABEL[order.status] ?? order.status.replace(/_/g, ' ');
  const variant = STATUS_VARIANT[order.status] ?? 'neutral';

  return (
    <Pressable
      onPress={() => router.push(`/(app)/receiving/${order.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Open delivery order ${order.external_order_id ?? order.id}`}
      className="bg-surface-800 rounded-xl p-4 active:opacity-70"
    >
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2">
          <Package size={16} color="#B3B0A6" strokeWidth={1.75} />
          <Text className="text-white font-semibold">
            {order.external_order_id ? `Order ${order.external_order_id}` : `Order ${order.id.slice(0, 8)}`}
          </Text>
        </View>
        <StatusBadge label={label} variant={variant} />
      </View>
      <Text className="text-surface-400 text-sm">
        {order.delivery_date
          ? `Expected ${new Date(order.delivery_date).toLocaleDateString()}`
          : `Created ${new Date(order.created_at).toLocaleDateString()}`}
      </Text>
      {order.status === 'delivered' && (
        <Text className="text-surface-500 text-xs mt-1">
          Updated {new Date(order.updated_at).toLocaleDateString()}
        </Text>
      )}
    </Pressable>
  );
}
