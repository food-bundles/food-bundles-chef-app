import { ScrollView, View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, Package, ShoppingCart, TrendingDown, CheckCircle, Utensils, Archive } from 'lucide-react-native';
import { useKitchenStore } from '@/store/kitchen-store';
import { useStockLevels } from '@/features/inventory/useStockLevels';
import { useOrders } from '@/features/orders/useOrders';
import { useDeliveries } from '@/features/receiving/useDeliveries';
import { useKitchens } from '@/features/kitchens/useKitchens';
import { useCatalog, type CatalogProductDto } from '@/features/purchasing/useCatalog';
import { SectionHeader, StockIndicator, SyncStatusBadge } from '@/components/ui';
import { ProductIcon } from '@/components/ui/ProductIcon';
import { calcDaysOfCover } from '@/domain/calculations/expected-use';
import { useSyncStatus } from '@/hooks/useSyncStatus';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);

  // Load kitchens from API (hydrates kitchen-store on success)
  useKitchens();

  const { data: stockLevels = [] } = useStockLevels();
  const { data: orders = [] } = useOrders();
  const { data: deliveries = [] } = useDeliveries();
  const { data: allCatalog = [], isLoading: catalogLoading } = useCatalog();

  const lowStockItems = stockLevels.filter((s) => s.is_low_stock);
  const lowStockCount = lowStockItems.length;

  const pendingOrderCount = orders.filter(
    (o) => o.status === 'submitted' || o.status === 'confirmed',
  ).length;

  const activeDeliveryCount = deliveries.filter(
    (d) => d.status !== 'delivered',
  ).length;

  const sync = useSyncStatus();

  const isNewKitchen =
    lowStockCount === 0 && pendingOrderCount === 0 && activeDeliveryCount === 0 && stockLevels.length === 0;

  const catalogPreview = allCatalog.filter((p) => p.is_active).slice(0, 10);

  const alerts: { id: string; message: string }[] = [];
  if (lowStockCount > 0) {
    alerts.push({
      id: 'low-stock',
      message: `${lowStockCount} ingredient${lowStockCount > 1 ? 's' : ''} below 1 day cover — reorder today.`,
    });
  }

  return (
    <View className="flex-1 bg-surface-50 dark:bg-surface-900" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-4 py-3 flex-row items-center justify-between border-b border-surface-200 dark:border-surface-800">
        <View>
          <Text className="text-surface-600 dark:text-surface-400 text-xs font-medium uppercase tracking-wider">
            Active Kitchen
          </Text>
          <Text className="text-surface-900 dark:text-white text-lg font-bold" numberOfLines={1}>
            {activeKitchen?.name ?? 'No kitchen selected'}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <SyncStatusBadge phase={sync.phase} pendingCount={sync.pendingCount} />
          <Pressable
            onPress={() => router.push('/(app)/kitchens')}
            accessibilityRole="button"
            accessibilityLabel="Switch kitchen"
            className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2"
          >
            <Text className="text-brand-400 text-sm font-medium">Switch</Text>
          </Pressable>
        </View>
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
              <Text key={alert.id} className="text-surface-700 dark:text-surface-300 text-sm mb-1">
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
            value={String(activeDeliveryCount)}
            valueColor="text-success"
            onPress={() => router.push('/(app)/receiving')}
          />
        </View>

        {/* Quick actions — always visible */}
        <View className="gap-2">
          <Text className="text-surface-600 dark:text-surface-400 text-xs font-medium uppercase tracking-wider">
            Quick Actions
          </Text>
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => router.push('/(app)/(tabs)/menu')}
              accessibilityRole="button"
              accessibilityLabel="Manage menu"
              className="flex-1 bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl p-4 items-center gap-2 active:opacity-70"
            >
              <View className="w-10 h-10 rounded-full bg-brand-500/15 items-center justify-center">
                <Utensils size={18} color="#1DB954" strokeWidth={2} />
              </View>
              <Text className="text-surface-900 dark:text-white font-semibold text-sm text-center">Menu</Text>
              <Text className="text-surface-600 dark:text-surface-400 text-xs text-center">Dishes &amp; recipes</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/(app)/receiving')}
              accessibilityRole="button"
              accessibilityLabel="Receive a delivery"
              className="flex-1 bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl p-4 items-center gap-2 active:opacity-70"
            >
              <View className="w-10 h-10 rounded-full bg-brand-500/15 items-center justify-center">
                <Package size={18} color="#1DB954" strokeWidth={2} />
              </View>
              <Text className="text-surface-900 dark:text-white font-semibold text-sm text-center">Receive</Text>
              <Text className="text-surface-600 dark:text-surface-400 text-xs text-center">Log a delivery</Text>
            </Pressable>
          </View>
        </View>

        {/* Catalog preview list */}
        <SectionHeader
          title="Catalog"
          actionLabel="See all"
          onAction={() => router.push('/(app)/(tabs)/purchasing')}
        />
        {catalogLoading ? (
          <View className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl p-4 items-center">
            <Text className="text-surface-600 dark:text-surface-400 text-sm">Loading catalog…</Text>
          </View>
        ) : catalogPreview.length === 0 ? (
          <View className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl p-4 items-center">
            <Text className="text-surface-600 dark:text-surface-400 text-sm">No products in catalog yet.</Text>
          </View>
        ) : (
          <View className="gap-2">
            {catalogPreview.map((product) => (
              <CatalogPreviewRow key={product.id} product={product} />
            ))}
            <Pressable
              onPress={() => router.push('/(app)/(tabs)/purchasing')}
              accessibilityRole="button"
              accessibilityLabel="View full catalog"
              className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl p-3 items-center active:opacity-70"
            >
              <Text className="text-brand-400 text-sm font-medium">View full catalog →</Text>
            </Pressable>
          </View>
        )}

        {/* New kitchen onboarding callouts */}
        {isNewKitchen && (
          <View className="gap-3">
            <Text className="text-surface-600 dark:text-surface-400 text-xs font-medium uppercase tracking-wider">
              Get Started
            </Text>
            <Pressable
              onPress={() => router.push('/(app)/(tabs)/menu')}
              accessibilityRole="button"
              accessibilityLabel="Add your first menu item"
              className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl p-4 flex-row items-center gap-3 active:opacity-70"
            >
              <View className="w-10 h-10 rounded-full bg-brand-500/15 items-center justify-center">
                <Utensils size={18} color="#1DB954" strokeWidth={2} />
              </View>
              <View className="flex-1">
                <Text className="text-surface-900 dark:text-white font-semibold text-sm">Add menu items</Text>
                <Text className="text-surface-600 dark:text-surface-400 text-xs mt-0.5">Set up your dishes and prices</Text>
              </View>
              <Text className="text-surface-500 text-lg">›</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/(app)/(tabs)/stock')}
              accessibilityRole="button"
              accessibilityLabel="Track your ingredients"
              className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl p-4 flex-row items-center gap-3 active:opacity-70"
            >
              <View className="w-10 h-10 rounded-full bg-brand-500/15 items-center justify-center">
                <Archive size={18} color="#1DB954" strokeWidth={2} />
              </View>
              <View className="flex-1">
                <Text className="text-surface-900 dark:text-white font-semibold text-sm">Track ingredients</Text>
                <Text className="text-surface-600 dark:text-surface-400 text-xs mt-0.5">Add stock to monitor purchasing needs</Text>
              </View>
              <Text className="text-surface-500 text-lg">›</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/(app)/receiving')}
              accessibilityRole="button"
              accessibilityLabel="Receive a delivery"
              className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl p-4 flex-row items-center gap-3 active:opacity-70"
            >
              <View className="w-10 h-10 rounded-full bg-brand-500/15 items-center justify-center">
                <Package size={18} color="#1DB954" strokeWidth={2} />
              </View>
              <View className="flex-1">
                <Text className="text-surface-900 dark:text-white font-semibold text-sm">Receive a delivery</Text>
                <Text className="text-surface-600 dark:text-surface-400 text-xs mt-0.5">Log an incoming supplier order</Text>
              </View>
              <Text className="text-surface-500 text-lg">›</Text>
            </Pressable>
          </View>
        )}

        {/* Low stock ingredients */}
        {!isNewKitchen && (
          <>
        <SectionHeader
          title="Low Stock"
          actionLabel="See all"
          onAction={() => router.push('/(app)/(tabs)/stock')}
        />
        {lowStockItems.length === 0 ? (
          <View className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl p-4 items-center">
            <Text className="text-surface-600 dark:text-surface-400 text-sm">All ingredients are stocked.</Text>
          </View>
        ) : (
          lowStockItems.map((item) => {
            const stock = parseFloat(item.current_stock);
            const dailyUse = item.expected_daily_use ? parseFloat(item.expected_daily_use) : 0;
            const days = calcDaysOfCover(stock, dailyUse);
            return (
              <View key={item.ingredient_id} className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl p-4 flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-surface-900 dark:text-white font-medium">{item.ingredient_name}</Text>
                  <Text className="text-surface-600 dark:text-surface-400 text-sm mt-0.5">
                    {item.current_stock} {item.unit} remaining
                  </Text>
                </View>
                <StockIndicator daysOfCover={days} />
              </View>
            );
          })
        )}

        {/* Procurement reminder */}
        {lowStockCount > 0 && (
          <View className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-4">
            <View className="flex-row items-center gap-2 mb-2">
              <CheckCircle size={16} color="#1DB954" strokeWidth={2} />
              <Text className="text-brand-400 font-semibold text-sm">Procurement Reminder</Text>
            </View>
            <Text className="text-surface-700 dark:text-surface-300 text-sm">
              {lowStockCount} ingredient{lowStockCount > 1 ? 's are' : ' is'} below the reorder threshold.
              Your purchase list is ready to review before tomorrow's service.
            </Text>
            <Pressable
              onPress={() => router.push('/(app)/(tabs)/purchasing')}
              accessibilityRole="button"
              accessibilityLabel="Review purchase list"
              className="mt-3 bg-brand-700 rounded-full py-3 items-center active:opacity-80"
            >
              <Text className="text-white font-bold text-sm">Review Purchase List ›</Text>
            </Pressable>
          </View>
        )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function CatalogPreviewRow({ product }: { product: CatalogProductDto }) {
  const price = product.reference_price != null ? parseFloat(product.reference_price) : null;
  return (
    <Pressable
      onPress={() => router.push('/(app)/(tabs)/purchasing')}
      accessibilityRole="button"
      accessibilityLabel={`${product.name} — go to catalog`}
      className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl p-3 flex-row items-center gap-3 active:opacity-70"
    >
      <ProductIcon
        imageUrl={product.image_url}
        category={product.category}
        productName={product.name}
        size="sm"
      />
      <View className="flex-1">
        <Text className="text-surface-900 dark:text-white font-medium text-sm">{product.name}</Text>
        <Text className="text-surface-600 dark:text-surface-400 text-xs capitalize">{product.category}</Text>
      </View>
      {price != null && (
        <Text className="text-brand-400 text-sm font-semibold">
          {price.toLocaleString()} RWF/{product.unit}
        </Text>
      )}
    </Pressable>
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
      className="flex-1 bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl p-3 items-center active:opacity-70"
    >
      {icon}
      <Text className={`text-2xl font-bold mt-2 ${valueColor}`}>{value}</Text>
      <Text className="text-surface-600 dark:text-surface-400 text-xs mt-1 text-center">{label}</Text>
    </Pressable>
  );
}
