import { ScrollView, View, Text, Pressable, RefreshControl, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, Package, ShoppingCart, TrendingDown, CheckCircle, Utensils, Archive, Truck, ClipboardList } from 'lucide-react-native';
import { useKitchenStore } from '@/store/kitchen-store';
import { useState } from 'react';
import { useStockLevels } from '@/features/inventory/useStockLevels';
import { useOrders } from '@/features/orders/useOrders';
import { useDeliveries } from '@/features/receiving/useDeliveries';
import { useKitchens } from '@/features/kitchens/useKitchens';
import { useCatalog, type CatalogProductDto } from '@/features/purchasing/useCatalog';
import { SectionHeader, StockIndicator, FoodBundlesCard } from '@/components/ui';
import { ProductIcon } from '@/components/ui/ProductIcon';
import { calcDaysOfCover } from '@/domain/calculations/expected-use';

// Card width: ~72% of screen so ~28% of next card peeks on the right
function useCardSnapWidth() {
  const { width } = useWindowDimensions();
  return Math.round(width * 0.72);
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const CARD_SNAP_WIDTH = useCardSnapWidth();
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);

  // Load kitchens from API (hydrates kitchen-store on success)
  useKitchens();

  const { data: stockLevels = [], refetch: refetchStock } = useStockLevels();
  const { data: orders = [], refetch: refetchOrders } = useOrders();
  const { data: deliveries = [], refetch: refetchDeliveries } = useDeliveries();
  const { data: allCatalog = [], isLoading: catalogLoading, refetch: refetchCatalog } = useCatalog();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStock(), refetchOrders(), refetchDeliveries(), refetchCatalog()]);
    setRefreshing(false);
  };

  const lowStockItems = stockLevels.filter((s) => s.is_low_stock);
  const lowStockCount = lowStockItems.length;

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
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0E8438" colors={['#0E8438']} />}
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

        {/* Summary row — horizontally scrollable stat cards, 72% width so next card peeks */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={CARD_SNAP_WIDTH + 10}
          snapToAlignment="start"
          contentContainerStyle={{ gap: 10, paddingRight: 24 }}
        >
          <Pressable
            onPress={() => router.push('/(app)/(tabs)/stock')}
            accessibilityRole="button"
            accessibilityLabel="Low stock items"
            style={({ pressed }) => ({ width: CARD_SNAP_WIDTH, opacity: pressed ? 0.85 : 1 })}
          >
            <FoodBundlesCard fromColor="#B91C1C" toColor="#7F1D1D">
              <StatCardContent
                icon={<TrendingDown size={18} color="rgba(255,255,255,0.8)" strokeWidth={2} />}
                label="Low Stock"
                value={String(lowStockCount)}
                subtitle={lowStockCount === 1 ? 'ingredient needs reorder' : 'ingredients need reorder'}
              />
            </FoodBundlesCard>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(app)/(tabs)/purchasing')}
            accessibilityRole="button"
            accessibilityLabel="Pending orders"
            style={({ pressed }) => ({ width: CARD_SNAP_WIDTH, opacity: pressed ? 0.85 : 1 })}
          >
            <FoodBundlesCard fromColor="#B45309" toColor="#78350F">
              <StatCardContent
                icon={<ShoppingCart size={18} color="rgba(255,255,255,0.8)" strokeWidth={2} />}
                label="Requisitions"
                value={String(pendingOrderCount)}
                subtitle="pending orders"
              />
            </FoodBundlesCard>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(app)/receiving')}
            accessibilityRole="button"
            accessibilityLabel="Active deliveries"
            style={({ pressed }) => ({ width: CARD_SNAP_WIDTH, opacity: pressed ? 0.85 : 1 })}
          >
            <FoodBundlesCard fromColor="#047857" toColor="#064E3B">
              <StatCardContent
                icon={<Package size={18} color="rgba(255,255,255,0.8)" strokeWidth={2} />}
                label="Deliveries"
                value={String(activeDeliveryCount)}
                subtitle="active in transit"
              />
            </FoodBundlesCard>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(app)/sales/entry' as never)}
            accessibilityRole="button"
            accessibilityLabel="Record sales"
            style={({ pressed }) => ({ width: CARD_SNAP_WIDTH, opacity: pressed ? 0.85 : 1 })}
          >
            <FoodBundlesCard fromColor="#0C7A32" toColor="#033818">
              <StatCardContent
                icon={<ClipboardList size={18} color="rgba(255,255,255,0.8)" strokeWidth={2} />}
                label="Sales"
                value="Record"
                subtitle="log today's service"
              />
            </FoodBundlesCard>
          </Pressable>
        </ScrollView>

        {/* Quick actions — always visible */}
        <View style={{ gap: 8 }}>
          <Text className="text-surface-600 dark:text-surface-400 text-xs font-semibold uppercase tracking-wider">
            Quick Actions
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { label: 'Receive', sub: 'Log delivery', icon: Truck, route: '/(app)/receiving/quick', accent: false },
              { label: 'Orders', sub: 'Requisitions', icon: ShoppingCart, route: '/(app)/(tabs)/purchasing', accent: false },
              { label: 'Menu', sub: 'Dishes', icon: Utensils, route: '/(app)/(tabs)/menu', accent: false },
              { label: 'Sales', sub: 'Record', icon: ClipboardList, route: '/(app)/sales/entry', accent: true },
            ].map(({ label, sub, icon: Icon, route, accent }) => (
              <Pressable
                key={label}
                onPress={() => router.push(route as never)}
                accessibilityRole="button"
                accessibilityLabel={label}
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: accent ? '#0E8438' : undefined,
                  borderRadius: 14,
                  padding: 10,
                  alignItems: 'center',
                  gap: 6,
                  opacity: pressed ? 0.75 : 1,
                  // non-accent: white card with border
                  ...(accent ? {
                    shadowColor: '#0E8438',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.35,
                    shadowRadius: 10,
                    elevation: 6,
                  } : {}),
                })}
                className={accent ? '' : 'bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent active:opacity-70'}
              >
                <View style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: accent ? 'rgba(255,255,255,0.2)' : '#0E843818',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Icon size={18} color={accent ? '#fff' : '#0E8438'} strokeWidth={2} />
                </View>
                <Text style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: accent ? '#fff' : undefined,
                  textAlign: 'center',
                }} className={accent ? '' : 'text-surface-900 dark:text-white'}>
                  {label}
                </Text>
                <Text style={{
                  fontSize: 9,
                  color: accent ? 'rgba(255,255,255,0.75)' : undefined,
                  textAlign: 'center',
                }} className={accent ? '' : 'text-surface-500'}>
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
                <Utensils size={18} color="#0E8438" strokeWidth={2} />
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
                <Archive size={18} color="#0E8438" strokeWidth={2} />
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
                <Package size={18} color="#0E8438" strokeWidth={2} />
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
              <CheckCircle size={16} color="#0E8438" strokeWidth={2} />
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

function StatCardContent({ icon, label, value, subtitle }: { icon: React.ReactNode; label: string; value: string; subtitle?: string }) {
  return (
    <View style={{ gap: 3 }}>
      {/* Icon + label row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ opacity: 0.8 }}>{icon}</View>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
          {label}
        </Text>
      </View>
      {/* Big value */}
      <Text style={{ color: '#fff', fontSize: 36, fontWeight: '800', letterSpacing: -1.5, lineHeight: 40 }}>{value}</Text>
      {/* Subtitle */}
      {subtitle ? (
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '500', letterSpacing: 0.1 }} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
