import { View, Text, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Package, Truck } from 'lucide-react-native';
import { useState } from 'react';
import { useDeliveries } from '@/features/receiving/useDeliveries';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/feedback/EmptyState';
import type { OrderDto } from '@/api/orders-api';
import type { BadgeVariant } from '@/components/ui/StatusBadge';
import type { OrderStatus } from '@/api/orders-api';

const STATUS_VARIANT: Partial<Record<OrderStatus, BadgeVariant>> = {
  submitted: 'warning',
  confirmed: 'warning',
  out_for_delivery: 'info',
  delivered: 'success',
};

const STATUS_LABEL: Partial<Record<OrderStatus, string>> = {
  submitted: 'Awaiting Delivery',
  confirmed: 'Pending',
  out_for_delivery: 'In Transit',
  delivered: 'Delivered',
};

export default function ReceivingIndexScreen() {
  const insets = useSafeAreaInsets();
  const { data: orders = [], isLoading, error, refetch } = useDeliveries();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  const pending = orders.filter((o) => o.status !== 'delivered');
  const completed = orders.filter((o) => o.status === 'delivered');

  return (
    <View className="flex-1 bg-surface-50 dark:bg-surface-900" style={{ paddingTop: insets.top }}>
      <View className="px-4 py-3 border-b border-surface-200 dark:border-surface-800">
        <Text className="text-surface-900 dark:text-white text-lg font-bold">Receiving</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#A3A899" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-danger text-sm text-center">
            Could not load deliveries. Check your connection and try again.
          </Text>
        </View>
      ) : (
        <FlatList
          data={[...pending, ...completed]}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0E8438" colors={['#0E8438']} />}
          ListHeaderComponent={
            pending.length > 0 ? (
              <Text className="text-surface-600 dark:text-surface-400 text-xs font-semibold uppercase tracking-wider mb-1">
                Expected Deliveries
              </Text>
            ) : undefined
          }
          renderItem={({ item: order }) => (
            <DeliveryRow order={order} />
          )}
          ListEmptyComponent={
            <View className="px-4 py-8 items-center gap-4">
              <View className="w-16 h-16 rounded-full bg-brand-500/10 items-center justify-center">
                <Truck size={28} color="#0E8438" strokeWidth={1.75} />
              </View>
              <View className="items-center gap-1">
                <Text className="text-surface-900 dark:text-white font-bold text-base">No deliveries yet</Text>
                <Text className="text-surface-600 dark:text-surface-400 text-sm text-center">
                  Confirmed orders from Food Bundles will appear here, ready to receive and log into stock.
                </Text>
              </View>
              <View className="w-full gap-2 mt-2">
                <Pressable
                  onPress={() => router.push('/(app)/(tabs)/purchasing' as never)}
                  accessibilityRole="button"
                  className="bg-brand-700 rounded-xl px-5 py-3.5 flex-row items-center justify-center gap-2 active:opacity-80"
                >
                  <Package size={16} color="#fff" strokeWidth={2} />
                  <Text className="text-white font-semibold text-sm">Place an Order</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push('/(app)/receiving/quick' as never)}
                  accessibilityRole="button"
                  className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl px-5 py-3.5 flex-row items-center justify-center gap-2 active:opacity-70"
                >
                  <Truck size={16} color="#0E8438" strokeWidth={2} />
                  <Text className="text-brand-400 font-semibold text-sm">Log a Walk-in Delivery</Text>
                </Pressable>
              </View>
            </View>
          }
        />
      )}
    </View>
  );
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function DeliveryRow({ order }: { order: OrderDto }) {
  const label = STATUS_LABEL[order.status] ?? order.status.replace(/_/g, ' ');
  const variant = STATUS_VARIANT[order.status] ?? 'neutral';

  return (
    <Pressable
      onPress={() => router.push(`/(app)/receiving/${order.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Open delivery order ${order.external_order_id ?? order.id}`}
      className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl p-4 active:opacity-70"
    >
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2">
          <Package size={16} color="#B3B0A6" strokeWidth={1.75} />
          <Text className="text-surface-900 dark:text-white font-semibold">
            {order.external_order_id ? `Order ${order.external_order_id}` : `Order ${order.id.slice(0, 8)}`}
          </Text>
        </View>
        <StatusBadge label={label} variant={variant} />
      </View>
      {order.delivery_date ? (
        <Text className="text-surface-600 dark:text-surface-400 text-xs">
          Expected {formatDateTime(order.delivery_date)}
        </Text>
      ) : (
        <Text className="text-surface-600 dark:text-surface-400 text-xs">
          Ordered {formatDateTime(order.created_at)}
        </Text>
      )}
      {order.status === 'delivered' && (
        <Text className="text-green-600 dark:text-green-400 text-xs mt-1 font-medium">
          Delivered {formatDateTime(order.updated_at)}
        </Text>
      )}
    </Pressable>
  );
}
