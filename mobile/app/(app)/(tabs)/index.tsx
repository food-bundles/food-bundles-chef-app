import { ScrollView, View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, Package, ShoppingCart, TrendingDown, CheckCircle } from 'lucide-react-native';
import { useKitchenStore } from '@/store/kitchen-store';
import { useStockStore } from '@/store/stock-store';
import { useOrderStore } from '@/store/order-store';
import { useDeliveryStore } from '@/store/delivery-store';
import { SectionHeader, StatusBadge, StockIndicator } from '@/components/ui';
import { calcDaysOfCover } from '@/domain/calculations/expected-use';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  const allStock = useStockStore((s) => s.items);
  const getLowStockItems = useStockStore((s) => s.getLowStockItems);

  const orders = useOrderStore((s) => s.orders);
  const deliveries = useDeliveryStore((s) => s.deliveries);
  const kitchenId = activeKitchen?.id ?? '';
  const lowStockItems = kitchenId ? getLowStockItems(kitchenId) : [];
  const lowStockCount = lowStockItems.length;

  const pendingOrderCount = orders.filter(
    (o) => o.kitchenId === kitchenId && (o.status === 'submitted' || o.status === 'confirmed'),
  ).length;
  const todayDeliveryCount = deliveries.filter(
    (d) => d.kitchenId === kitchenId && d.status !== 'completed',
  ).length;

  const alerts: { id: string; message: string }[] = [];
  if (lowStockCount > 0) {
    alerts.push({
      id: 'low-stock',
      message: `${lowStockCount} ingredient${lowStockCount > 1 ? 's' : ''} below 1 day cover — reorder today.`,
    });
  }

  return (
    <View className="flex-1 bg-surface-900" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-4 py-3 flex-row items-center justify-between border-b border-surface-800">
        <View>
          <Text className="text-surface-400 text-xs font-medium uppercase tracking-wider">
            Active Kitchen
          </Text>
          <Text className="text-white text-lg font-bold" numberOfLines={1}>
            {activeKitchen?.name ?? 'No kitchen selected'}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/(app)/kitchens')}
          accessibilityRole="button"
          accessibilityLabel="Switch kitchen"
          className="bg-surface-800 rounded-lg px-3 py-2"
        >
          <Text className="text-brand-400 text-sm font-medium">Switch</Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Alerts */}
        {alerts.length > 0 && (
          <View className="bg-warning/10 border border-warning/30 rounded-xl p-4">
            <View className="flex-row items-center gap-2 mb-3">
              <AlertTriangle size={16} color="#F59E0B" strokeWidth={2} />
              <Text className="text-warning font-semibold text-sm">
                {alerts.length} Alert{alerts.length > 1 ? 's' : ''}
              </Text>
            </View>
            {alerts.map((alert) => (
              <Text key={alert.id} className="text-surface-300 text-sm mb-1">
                • {alert.message}
              </Text>
            ))}
          </View>
        )}

        {/* Summary row */}
        <View className="flex-row gap-3">
          <StatCard
            icon={<TrendingDown size={18} color="#EF4444" strokeWidth={2} />}
            label="Low Stock"
            value={String(lowStockCount)}
            valueColor="text-danger"
            onPress={() => router.push('/(app)/(tabs)/stock')}
          />
          <StatCard
            icon={<ShoppingCart size={18} color="#F59E0B" strokeWidth={2} />}
            label="Pending Orders"
            value={String(pendingOrderCount)}
            valueColor="text-warning"
            onPress={() => router.push('/(app)/(tabs)/purchasing')}
          />
          <StatCard
            icon={<Package size={18} color="#1DB954" strokeWidth={2} />}
            label="Deliveries"
            value={String(todayDeliveryCount)}
            valueColor="text-success"
            onPress={() => router.push('/(app)/receiving')}
          />
        </View>

        {/* Low stock ingredients */}
        <SectionHeader
          title="Low Stock"
          actionLabel="See all"
          onAction={() => router.push('/(app)/(tabs)/stock')}
        />
        {lowStockItems.length === 0 ? (
          <View className="bg-surface-800 rounded-xl p-4 items-center">
            <Text className="text-surface-400 text-sm">All ingredients are stocked.</Text>
          </View>
        ) : (
          lowStockItems.map((item) => {
            const days = calcDaysOfCover(item.quantityOnHand, item.dailyUseRate);
            return (
              <View key={item.id} className="bg-surface-800 rounded-xl p-4 flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-white font-medium">{item.ingredientName}</Text>
                  <Text className="text-surface-400 text-sm mt-0.5">
                    {item.quantityOnHand} {item.unit} remaining
                  </Text>
                </View>
                <StockIndicator daysOfCover={days} />
              </View>
            );
          })
        )}

        {/* Procurement reminder — show only when there are low-stock items */}
        {lowStockCount > 0 && (
          <View className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-4">
            <View className="flex-row items-center gap-2 mb-2">
              <CheckCircle size={16} color="#1DB954" strokeWidth={2} />
              <Text className="text-brand-400 font-semibold text-sm">Procurement Reminder</Text>
            </View>
            <Text className="text-surface-300 text-sm">
              {lowStockCount} ingredient{lowStockCount > 1 ? 's are' : ' is'} below the reorder threshold.
              Your purchase list is ready to review before tomorrow's service.
            </Text>
            <Pressable
              onPress={() => router.push('/(app)/(tabs)/purchasing')}
              accessibilityRole="button"
              accessibilityLabel="Review purchase list"
              className="mt-3 bg-brand-500 rounded-lg py-2.5 items-center active:opacity-80"
            >
              <Text className="text-white font-semibold text-sm">Review Purchase List</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  valueColor,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : 'none'}
      accessibilityLabel={label}
      className="flex-1 bg-surface-800 rounded-xl p-3 items-center active:opacity-70"
    >
      {icon}
      <Text className={`text-2xl font-bold mt-2 ${valueColor}`}>{value}</Text>
      <Text className="text-surface-400 text-xs mt-1 text-center">{label}</Text>
    </Pressable>
  );
}
