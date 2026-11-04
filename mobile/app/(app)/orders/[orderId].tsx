import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Package } from 'lucide-react-native';
import { useOrderDetail, useCancelOrder, useSubmitOrder } from '@/features/orders/useOrders';
import { useCatalog } from '@/features/purchasing/useCatalog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ProductIcon } from '@/components/ui/ProductIcon';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'info' | 'neutral'> = {
  delivered: 'success',
  confirmed: 'info',
  submitted: 'warning',
  out_for_delivery: 'info',
  cancelled: 'neutral',
  draft: 'neutral',
};

export default function OrderDetailScreen() {
  const insets = useSafeAreaInsets();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { data: order, isLoading, error } = useOrderDetail(orderId ?? '');
  const cancelMutation = useCancelOrder();
  const submitMutation = useSubmitOrder();
  const { data: catalog = [] } = useCatalog();
  // Build a map from catalog_product_id → image_url for quick lookup
  const catalogImageMap = Object.fromEntries(
    catalog.filter((p) => p.image_url).map((p) => [p.id, p.image_url] as [string, string])
  );

  const totalValue = order?.lines.reduce(
    (sum, l) => sum + parseFloat(l.quantity_ordered) * parseFloat(l.unit_price),
    0,
  ) ?? 0;

  const canSubmit = order?.status === 'draft';
  const canCancel = order && (order.status === 'draft' || order.status === 'submitted');

  return (
    <View className="flex-1 bg-surface-50 dark:bg-surface-900" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-4 py-3 flex-row items-center gap-3 border-b border-surface-200 dark:border-surface-800">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ArrowLeft size={22} color="#B3B0A6" strokeWidth={2} />
        </Pressable>
        <View className="flex-1">
          <Text className="text-surface-900 dark:text-white text-lg font-bold">
            Order #{order?.id.slice(-6).toUpperCase() ?? '…'}
          </Text>
          {order && (
            <Text className="text-surface-600 dark:text-surface-400 text-xs">
              {new Date(order.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
            </Text>
          )}
        </View>
        {order && (
          <StatusBadge
            label={order.status.replace(/_/g, ' ')}
            variant={STATUS_VARIANT[order.status] ?? 'neutral'}
          />
        )}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1DB954" />
        </View>
      ) : error || !order ? (
        <View className="flex-1 items-center justify-center px-8 gap-3">
          <Package size={40} color="#4D4B45" strokeWidth={1.5} />
          <Text className="text-surface-600 dark:text-surface-400 text-center">Could not load order details.</Text>
          <Pressable onPress={() => router.back()} className="mt-2 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl px-6 py-3 active:opacity-70">
            <Text className="text-brand-400 font-medium">Go back</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary card */}
          <View className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl p-4 gap-2">
            <View className="flex-row justify-between">
              <Text className="text-surface-600 dark:text-surface-400 text-xs uppercase tracking-wider">Total Value</Text>
              <Text className="text-surface-900 dark:text-white font-bold text-base">
                {totalValue.toLocaleString()} RWF
              </Text>
            </View>
            {order.delivery_date && (
              <View className="flex-row justify-between">
                <Text className="text-surface-600 dark:text-surface-400 text-xs uppercase tracking-wider">Delivery</Text>
                <Text className="text-surface-700 dark:text-surface-300 text-sm">
                  {new Date(order.delivery_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </Text>
              </View>
            )}
            {order.notes && (
              <Text className="text-surface-600 dark:text-surface-400 text-xs mt-1">{order.notes}</Text>
            )}
          </View>

          {/* Line items */}
          <Text className="text-surface-600 dark:text-surface-400 text-xs font-medium uppercase tracking-wider">
            Items ({order.lines.length})
          </Text>
          {order.lines.length === 0 ? (
            <View className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl p-4 items-center">
              <Text className="text-surface-500 text-sm">No line items found.</Text>
            </View>
          ) : (
            order.lines.map((line) => {
              const qty = parseFloat(line.quantity_ordered);
              const price = parseFloat(line.unit_price);
              const lineTotal = qty * price;
              const imageUrl = catalogImageMap[line.catalog_product_id] ?? null;
              return (
                <View key={line.id} className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl p-4 flex-row items-center gap-3">
                  <ProductIcon
                    imageUrl={imageUrl}
                    productName={line.product_name}
                    size="md"
                  />
                  <View className="flex-1">
                    <Text className="text-surface-900 dark:text-white font-medium">{line.product_name}</Text>
                    <Text className="text-surface-600 dark:text-surface-400 text-xs mt-0.5">
                      {qty} {line.unit} × {price.toLocaleString()} RWF
                    </Text>
                  </View>
                  <Text className="text-brand-400 font-semibold text-sm">
                    {lineTotal.toLocaleString()} RWF
                  </Text>
                </View>
              );
            })
          )}

          {/* Submit draft to confirmed */}
          {canSubmit && (
            <Pressable
              onPress={async () => {
                await submitMutation.mutateAsync(order.id);
                router.back();
              }}
              disabled={submitMutation.isPending}
              accessibilityRole="button"
              accessibilityLabel="Submit order"
              className="mt-2 bg-brand-500 rounded-xl p-4 items-center active:opacity-80"
            >
              <Text className="text-white font-semibold text-sm">
                {submitMutation.isPending ? 'Submitting…' : 'Submit Order → Ready for Delivery'}
              </Text>
            </Pressable>
          )}

          {/* Cancel action */}
          {canCancel && (
            <Pressable
              onPress={async () => {
                await cancelMutation.mutateAsync(order.id);
                router.back();
              }}
              disabled={cancelMutation.isPending}
              accessibilityRole="button"
              accessibilityLabel="Cancel order"
              className="mt-2 border border-danger/40 rounded-xl p-4 items-center active:opacity-70"
            >
              <Text className="text-danger font-medium text-sm">
                {cancelMutation.isPending ? 'Cancelling…' : 'Cancel Order'}
              </Text>
            </Pressable>
          )}
        </ScrollView>
      )}
    </View>
  );
}
