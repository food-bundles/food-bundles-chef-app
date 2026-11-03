import { View, Text, ScrollView, Pressable, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Package } from 'lucide-react-native';
import { useOrderDetail, useCancelOrder } from '@/features/orders/useOrders';
import { StatusBadge } from '@/components/ui/StatusBadge';

const CATEGORY_EMOJI: Record<string, string> = {
  vegetables: '🥦', fruits: '🍎', meat: '🥩', poultry: '🍗', seafood: '🐟',
  dairy: '🧀', eggs: '🥚', grains: '🌾', legumes: '🫘', spices: '🌶️',
  herbs: '🌿', oils: '🫙', sauces: '🥫', beverages: '🧃', bakery: '🍞',
  frozen: '🧊', cleaning: '🧹',
};

function getProductEmoji(productName: string): string {
  const lower = productName.toLowerCase();
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJI)) {
    if (lower.includes(key)) return emoji;
  }
  if (lower.includes('tomato') || lower.includes('nyanya')) return '🍅';
  if (lower.includes('onion') || lower.includes('iyayi')) return '🧅';
  if (lower.includes('potato') || lower.includes('ibijumba')) return '🥔';
  if (lower.includes('carrot')) return '🥕';
  if (lower.includes('rice') || lower.includes('iresi')) return '🍚';
  if (lower.includes('bean') || lower.includes('ibishyimbo')) return '🫘';
  if (lower.includes('beef') || lower.includes('inka')) return '🥩';
  if (lower.includes('chicken') || lower.includes('inkoko')) return '🍗';
  if (lower.includes('fish') || lower.includes('inzoga')) return '🐟';
  if (lower.includes('milk') || lower.includes('amata')) return '🥛';
  if (lower.includes('egg') || lower.includes('amagi')) return '🥚';
  if (lower.includes('oil') || lower.includes('amavuta')) return '🫙';
  if (lower.includes('salt') || lower.includes('munyu')) return '🧂';
  if (lower.includes('sugar') || lower.includes('shukari')) return '🍬';
  if (lower.includes('coffee') || lower.includes('ikawa')) return '☕';
  if (lower.includes('tea') || lower.includes('icyayi')) return '🍵';
  if (lower.includes('water') || lower.includes('amazi')) return '💧';
  if (lower.includes('flour') || lower.includes('ubunga')) return '🌾';
  return '📦';
}

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

  const totalValue = order?.lines.reduce(
    (sum, l) => sum + parseFloat(l.quantity_ordered) * parseFloat(l.unit_price),
    0,
  ) ?? 0;

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
              const emoji = getProductEmoji(line.product_name);
              return (
                <View key={line.id} className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl p-4 flex-row items-center gap-3">
                  <View className="w-12 h-12 rounded-xl bg-surface-100 dark:bg-surface-700 items-center justify-center">
                    <Text style={{ fontSize: 26 }}>{emoji}</Text>
                  </View>
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
