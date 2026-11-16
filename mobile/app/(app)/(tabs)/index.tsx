import { ScrollView, View, Text, Pressable, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, Package, ShoppingCart, TrendingDown, CheckCircle, Utensils, Archive, Truck, ClipboardList } from 'lucide-react-native';
import { colors } from '@/lib/theme';
import { useKitchenStore } from '@/store/kitchen-store';
import { useState } from 'react';
import { useStockLevels } from '@/features/inventory/useStockLevels';
import { useOrders } from '@/features/orders/useOrders';
import { useDeliveries } from '@/features/receiving/useDeliveries';
import { useKitchens } from '@/features/kitchens/useKitchens';
import { useCatalog, type CatalogProductDto } from '@/features/purchasing/useCatalog';
import { SectionHeader, StockIndicator } from '@/components/ui';
import { KPITile } from '@/components/ui/KPITile';
import { ProductIcon } from '@/components/ui/ProductIcon';
import { calcDaysOfCover } from '@/domain/calculations/expected-use';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);

  // Load kitchens from API (hydrates kitchen-store on success)
  useKitchens();

  const { data: stockLevels = [], isLoading: stockLoading, refetch: refetchStock } = useStockLevels();
  const { data: orders = [], isLoading: ordersLoading, refetch: refetchOrders } = useOrders();
  const { data: deliveries = [], refetch: refetchDeliveries } = useDeliveries();
  const { data: allCatalog = [], isLoading: catalogLoading, refetch: refetchCatalog } = useCatalog();
  const isLiveData = stockLoading || ordersLoading;
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStock(), refetchOrders(), refetchDeliveries(), refetchCatalog()]);
    setRefreshing(false);
  };

  const lowStockItems = stockLevels.filter((s) => s.is_low_stock);
  const lowStockCount = lowStockItems.length;
  const outOfStockCount = stockLevels.filter((s) => parseFloat(s.current_stock) <= 0).length;
  // 3-tier: 0 = neutral/success; 1–3 = amber warning; >3 or any out-of-stock = red danger
  const lowStockColor: 'green' | 'amber' | 'red' =
    lowStockCount === 0 ? 'green'
    : outOfStockCount > 0 || lowStockCount > 3 ? 'red'
    : 'amber';
  const lowStockIconColor = lowStockColor === 'green' ? colors.brand[500] : lowStockColor === 'amber' ? colors.warning : colors.danger;
  const lowStockSublabel =
    lowStockCount === 0 ? 'All stocked'
    : lowStockColor === 'red' ? 'Action needed'
    : lowStockCount === 1 ? 'ingredient low' : 'ingredients low';

  const pendingOrderCount = orders.filter(
    (o) => o.status === 'submitted' || o.status === 'confirmed',
  ).length;

  const activeDeliveryCount = deliveries.filter(
    (d) => d.status !== 'delivered',
  ).length;

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
      {/* Header — with header-level LIVE indicator (#7) */}
      <View className="px-4 py-3 flex-row items-center justify-between border-b border-surface-200 dark:border-surface-800">
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text className="text-surface-600 dark:text-surface-400 text-xs font-medium uppercase tracking-wider">
              Active Kitchen
            </Text>
            {isLiveData && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.brand[500] }} />
                <Text style={{ fontSize: 9, fontWeight: '700', color: colors.brand[500], letterSpacing: 0.5 }}>LIVE</Text>
              </View>
            )}
          </View>
          <Text className="text-surface-900 dark:text-white text-lg font-bold" numberOfLines={1}>
            {activeKitchen?.name ?? 'No kitchen selected'}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/(app)/kitchens')}
          accessibilityRole="button"
          accessibilityLabel="Switch kitchen"
          className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2"
        >
          <Text className="text-brand-400 text-sm font-medium">Switch Kitchen</Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 88 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />}
      >
        {/* Alerts */}
        {alerts.length > 0 && (
          <View className="bg-warning/10 border border-warning/30 rounded-xl p-4">
            <View className="flex-row items-center gap-2 mb-3">
              <AlertTriangle size={16} color={colors.warning} strokeWidth={2} />
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

        {/* KPI grid — 2×2, reflows to 1-col at 200% font (#7, #17) */}
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <View style={{ flex: 1, minWidth: 140 }}>
            <KPITile
              value={lowStockCount === 0 ? '✓' : String(lowStockCount)}
              label="Low Stock"
              sublabel={lowStockSublabel}
              icon={<TrendingDown size={18} color={lowStockIconColor} strokeWidth={2} />}
              color={lowStockColor}
              onPress={() => router.push('/(app)/(tabs)/stock')}
            />
          </View>
          <View style={{ flex: 1, minWidth: 140 }}>
            <KPITile
              value={pendingOrderCount}
              label="Requisitions"
              sublabel={pendingOrderCount === 1 ? 'pending order' : 'pending orders'}
              icon={<ShoppingCart size={18} color={pendingOrderCount > 0 ? colors.warning : colors.surface[500]} strokeWidth={2} />}
              color={pendingOrderCount > 0 ? 'amber' : 'neutral'}
              onPress={() => router.push('/(app)/(tabs)/purchasing')}
            />
          </View>
          <View style={{ flex: 1, minWidth: 140 }}>
            <KPITile
              value={activeDeliveryCount}
              label="Deliveries"
              sublabel={activeDeliveryCount === 1 ? 'in transit' : 'in transit'}
              icon={<Package size={18} color={activeDeliveryCount > 0 ? colors.info : colors.surface[500]} strokeWidth={2} />}
              color={activeDeliveryCount > 0 ? 'blue' : 'neutral'}
              onPress={() => router.push('/(app)/receiving' as never)}
            />
          </View>
          <View style={{ flex: 1, minWidth: 140 }}>
            <KPITile
              value="Log"
              label="Sales"
              sublabel="record today"
              icon={<ClipboardList size={18} color={colors.brand[500]} strokeWidth={2} />}
              color="green"
              onPress={() => router.push('/(app)/sales/entry' as never)}
            />
          </View>
        </View>

        {/* Quick Actions — 4 identical tiles, ≥12pt captions (#8) */}
        <View style={{ gap: 8 }}>
          <Text className="text-surface-600 dark:text-surface-400 text-xs font-semibold uppercase tracking-wider">
            Quick Actions
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { label: 'Receive', sub: 'Log delivery', icon: Truck, route: '/(app)/receiving/quick' },
              { label: 'Orders', sub: 'Requisitions', icon: ShoppingCart, route: '/(app)/(tabs)/purchasing' },
              { label: 'Menu', sub: 'Manage dishes', icon: Utensils, route: '/(app)/(tabs)/menu' },
              { label: 'Sales', sub: 'Record sale', icon: ClipboardList, route: '/(app)/sales/entry' },
            ].map(({ label, sub, icon: Icon, route }) => (
              <Pressable
                key={label}
                onPress={() => router.push(route as never)}
                accessibilityRole="button"
                accessibilityLabel={`${label}: ${sub}`}
                style={({ pressed }) => ({
                  flex: 1,
                  borderRadius: 14,
                  padding: 10,
                  alignItems: 'center',
                  gap: 6,
                  opacity: pressed ? 0.75 : 1,
                })}
                className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent active:opacity-70"
              >
                <View style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: colors.brand[50],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Icon size={18} color={colors.brand[500]} strokeWidth={2} />
                </View>
                <Text style={{ fontSize: 12, fontWeight: '700', textAlign: 'center' }} className="text-surface-900 dark:text-white">
                  {label}
                </Text>
                <Text style={{ fontSize: 12, textAlign: 'center' }} className="text-surface-500">
                  {sub}
                </Text>
              </Pressable>
            ))}
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
                <Utensils size={18} color={colors.brand[500]} strokeWidth={2} />
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
                <Archive size={18} color={colors.brand[500]} strokeWidth={2} />
              </View>
              <View className="flex-1">
                <Text className="text-surface-900 dark:text-white font-semibold text-sm">Track ingredients</Text>
                <Text className="text-surface-600 dark:text-surface-400 text-xs mt-0.5">Add stock to monitor purchasing needs</Text>
              </View>
              <Text className="text-surface-500 text-lg">›</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/(app)/receiving/quick')}
              accessibilityRole="button"
              accessibilityLabel="Receive a delivery"
              className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl p-4 flex-row items-center gap-3 active:opacity-70"
            >
              <View className="w-10 h-10 rounded-full bg-brand-500/15 items-center justify-center">
                <Package size={18} color={colors.brand[500]} strokeWidth={2} />
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
              <CheckCircle size={16} color={colors.brand[500]} strokeWidth={2} />
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

