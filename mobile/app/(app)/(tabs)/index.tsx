import { ScrollView, View, Text, RefreshControl } from 'react-native';
import { AppPressable } from '@/components/ui/AppPressable';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
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
import { useTodaySales } from '@/features/sales/useSales';
import { formatQuantity, formatRWF } from '@/lib/format';
import { formatSalesTotal } from '@/features/sales/sales-total';

export default function DashboardScreen() {
  const { t, i18n } = useTranslation();
  const { data: todaySales, refetch: refetchSales } = useTodaySales();
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
    await Promise.all([refetchStock(), refetchOrders(), refetchDeliveries(), refetchCatalog(), refetchSales()]);
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
    alerts.push({ id: 'low-stock', message: t('dashboard.lowStockAlert', { count: lowStockCount }) });
  }

  return (
    <View className="flex-1 bg-surface-50 dark:bg-surface-900" style={{ paddingTop: insets.top }}>
      {/* Header — with header-level LIVE indicator (#7) */}
      <View className="px-4 py-3 flex-row items-center justify-between border-b border-surface-200 dark:border-surface-800">
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text className="text-surface-600 dark:text-surface-400 text-xs font-medium uppercase tracking-wider">
              {t('dashboard.activeKitchen')}
            </Text>
            {isLiveData && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.brand[500] }} />
                <Text style={{ fontSize: 9, fontWeight: '700', color: colors.brand[500], letterSpacing: 0.5 }}>{t('dashboard.live')}</Text>
              </View>
            )}
          </View>
          <Text className="text-surface-900 dark:text-white text-lg font-bold" numberOfLines={1}>
            {activeKitchen?.name ?? t('dashboard.noKitchen')}
          </Text>
        </View>
        <AppPressable
          onPress={() => router.push('/(app)/kitchens')}
          accessibilityRole="button"
          accessibilityLabel={t('dashboard.switchKitchen')}
          className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2"
        >
          <Text className="text-brand-600 dark:text-brand-300 text-sm font-medium">{t('dashboard.switchKitchen')}</Text>
        </AppPressable>
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
                {t('dashboard.alertsCount', { count: alerts.length })}
              </Text>
            </View>
            {alerts.map((alert) => (
              <Text key={alert.id} className="text-surface-700 dark:text-surface-300 text-sm mb-1">
                • {alert.message}
              </Text>
            ))}
          </View>
        )}

        {/* KPI grid — 2 equal columns, gap 12 */}
        <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <KPITile
              value={lowStockCount === 0 ? '✓' : String(lowStockCount)}
              label={t('dashboard.lowStock')}
              sublabel={lowStockSublabel}
              icon={<TrendingDown size={18} color={lowStockIconColor} strokeWidth={2} />}
              color={lowStockColor}
              onPress={() => router.push('/(app)/(tabs)/stock')}
            />
          </View>
          <View style={{ flex: 1 }}>
            <KPITile
              value={pendingOrderCount}
              label={t('dashboard.pendingOrders')}
              sublabel={pendingOrderCount === 1 ? 'pending order' : 'pending orders'}
              icon={<ShoppingCart size={18} color={pendingOrderCount > 0 ? colors.warning : colors.surface[500]} strokeWidth={2} />}
              color={pendingOrderCount > 0 ? 'amber' : 'neutral'}
              onPress={() => router.push('/(app)/(tabs)/purchasing')}
            />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <KPITile
              value={activeDeliveryCount}
              label={t('dashboard.deliveries')}
              sublabel={activeDeliveryCount === 1 ? 'in transit' : 'in transit'}
              icon={<Package size={18} color={activeDeliveryCount > 0 ? colors.info : colors.surface[500]} strokeWidth={2} />}
              color={activeDeliveryCount > 0 ? 'blue' : 'neutral'}
              onPress={() => router.push('/(app)/receiving' as never)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <KPITile
              value={formatSalesTotal(todaySales, activeKitchen?.currency ?? 'RWF', i18n.language)}
              label={t('dashboard.sales')}
              sublabel={t('dashboard.salesToday', { count: todaySales?.portions ?? 0 })}
              icon={<ClipboardList size={18} color={colors.brand[500]} strokeWidth={2} />}
              color="green"
              onPress={() => router.push('/(app)/sales/entry' as never)}
            />
          </View>
        </View>
        </View>

        {/* Quick Actions — 2×2 grid, full width */}
        <View style={{ gap: 8 }}>
          <Text className="text-surface-600 dark:text-surface-400 text-xs font-semibold uppercase tracking-wider">
            {t('dashboard.quickActions')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {[
              { key: 'receive', label: t('dashboard.qaReceive'), sub: t('dashboard.qaReceiveSub'), icon: Truck, route: '/(app)/receiving/quick' },
              { key: 'orders', label: t('dashboard.qaOrders'), sub: t('dashboard.qaOrdersSub'), icon: ShoppingCart, route: '/(app)/(tabs)/purchasing' },
              { key: 'menu', label: t('dashboard.qaMenu'), sub: t('dashboard.qaMenuSub'), icon: Utensils, route: '/(app)/(tabs)/menu' },
              { key: 'sales', label: t('dashboard.qaSales'), sub: t('dashboard.qaSalesSub'), icon: ClipboardList, route: '/(app)/sales/entry' },
            ].map(({ key, label, sub, icon: Icon, route }) => (
              <AppPressable
                key={key}
                onPress={() => router.push(route as never)}
                accessibilityRole="button"
                accessibilityLabel={`${label}: ${sub}`}
                style={({ pressed }) => ({
                  flexBasis: '47%',
                  flexGrow: 1,
                  borderRadius: 16,
                  padding: 16,
                  alignItems: 'center',
                  gap: 6,
                  opacity: pressed ? 0.75 : 1,
                })}
                className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700"
              >
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.brand[50],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Icon size={18} color={colors.brand[500]} strokeWidth={2} />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', textAlign: 'center' }} className="text-surface-900 dark:text-white">
                  {label}
                </Text>
                <Text style={{ fontSize: 12, textAlign: 'center' }} className="text-surface-600 dark:text-surface-400">
                  {sub}
                </Text>
              </AppPressable>
            ))}
          </View>
        </View>

        {/* Catalog preview list: only where Food Bundles operates */}
        {activeKitchen?.catalogAvailable ? (
          <>
        <SectionHeader
          title={t('dashboard.catalog')}
          actionLabel={t('common.seeAll')}
          onAction={() => router.push('/(app)/(tabs)/purchasing')}
        />
        {catalogLoading ? (
          <View className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl p-4 items-center">
            <Text className="text-surface-600 dark:text-surface-400 text-sm">{t('dashboard.catalogLoading')}</Text>
          </View>
        ) : catalogPreview.length === 0 ? (
          <View className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl p-4 gap-3">
            <Text className="text-surface-600 dark:text-surface-400 text-sm text-center">{t('dashboard.catalogEmpty')}</Text>
            <AppPressable
              onPress={() => router.push('/(app)/(tabs)/purchasing')}
              accessibilityRole="button"
              accessibilityLabel={t('dashboard.browseCatalog')}
              className="bg-brand-500 rounded-xl py-2.5 items-center active:opacity-80"
            >
              <Text className="text-white font-semibold text-sm">{t('dashboard.browseCatalog')}</Text>
            </AppPressable>
            <AppPressable
              onPress={() => router.push('/(app)/receiving/quick')}
              accessibilityRole="button"
              accessibilityLabel={t('purchasing.logDeliveryManually')}
              className="border border-brand-500 rounded-xl py-2.5 items-center active:opacity-80"
            >
              <Text className="text-brand-600 dark:text-brand-300 font-semibold text-sm">{t('purchasing.logDeliveryManually')}</Text>
            </AppPressable>
          </View>
        ) : (
          <View className="gap-2">
            {catalogPreview.map((product) => (
              <CatalogPreviewRow key={product.id} product={product} />
            ))}
            <AppPressable
              onPress={() => router.push('/(app)/(tabs)/purchasing')}
              accessibilityRole="button"
              accessibilityLabel={t('dashboard.viewFullCatalog')}
              className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl p-3 items-center active:opacity-70"
            >
              <Text className="text-brand-600 dark:text-brand-300 text-sm font-medium">{t('dashboard.viewFullCatalog')}</Text>
            </AppPressable>
          </View>
        )}
          </>
        ) : null}

        {/* New kitchen onboarding callouts */}
        {isNewKitchen && (
          <View className="gap-3">
            <Text className="text-surface-600 dark:text-surface-400 text-xs font-medium uppercase tracking-wider">
              {t('common.continue')}
            </Text>
            <AppPressable
              onPress={() => router.push('/(app)/(tabs)/menu')}
              accessibilityRole="button"
              accessibilityLabel={t('dashboard.onboardingAddMenu')}
              className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl p-4 flex-row items-center gap-3 active:opacity-70"
            >
              <View className="w-10 h-10 rounded-full bg-brand-500/15 items-center justify-center">
                <Utensils size={18} color={colors.brand[500]} strokeWidth={2} />
              </View>
              <View className="flex-1">
                <Text className="text-surface-900 dark:text-white font-semibold text-sm">{t('dashboard.onboardingAddMenu')}</Text>
                <Text className="text-surface-600 dark:text-surface-400 text-xs mt-0.5">{t('dashboard.onboardingAddMenuSub')}</Text>
              </View>
              <Text className="text-surface-500 text-lg">›</Text>
            </AppPressable>
            <AppPressable
              onPress={() => router.push('/(app)/(tabs)/stock')}
              accessibilityRole="button"
              accessibilityLabel={t('dashboard.onboardingTrackIngredients')}
              className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl p-4 flex-row items-center gap-3 active:opacity-70"
            >
              <View className="w-10 h-10 rounded-full bg-brand-500/15 items-center justify-center">
                <Archive size={18} color={colors.brand[500]} strokeWidth={2} />
              </View>
              <View className="flex-1">
                <Text className="text-surface-900 dark:text-white font-semibold text-sm">{t('dashboard.onboardingTrackIngredients')}</Text>
                <Text className="text-surface-600 dark:text-surface-400 text-xs mt-0.5">{t('dashboard.onboardingTrackIngredientsSub')}</Text>
              </View>
              <Text className="text-surface-500 text-lg">›</Text>
            </AppPressable>
            <AppPressable
              onPress={() => router.push('/(app)/receiving/quick')}
              accessibilityRole="button"
              accessibilityLabel={t('dashboard.onboardingReceiveDelivery')}
              className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl p-4 flex-row items-center gap-3 active:opacity-70"
            >
              <View className="w-10 h-10 rounded-full bg-brand-500/15 items-center justify-center">
                <Package size={18} color={colors.brand[500]} strokeWidth={2} />
              </View>
              <View className="flex-1">
                <Text className="text-surface-900 dark:text-white font-semibold text-sm">{t('dashboard.onboardingReceiveDelivery')}</Text>
                <Text className="text-surface-600 dark:text-surface-400 text-xs mt-0.5">{t('dashboard.onboardingReceiveDeliverySub')}</Text>
              </View>
              <Text className="text-surface-500 text-lg">›</Text>
            </AppPressable>
          </View>
        )}

        {/* Low stock ingredients */}
        {!isNewKitchen && (
          <>
        <SectionHeader
          title={t('dashboard.lowStock')}
          actionLabel={t('common.seeAll')}
          onAction={() => router.push('/(app)/(tabs)/stock')}
        />
        {lowStockItems.length === 0 ? (
          <View className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl p-4 items-center">
            <Text className="text-surface-600 dark:text-surface-400 text-sm">{t('dashboard.allIngredientsStocked')}</Text>
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
                    {t('dashboard.remaining', { qty: formatQuantity(item.current_stock, i18n.language), unit: item.unit })}
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
              <Text className="text-brand-600 dark:text-brand-300 font-semibold text-sm">{t('dashboard.procurementReminder')}</Text>
            </View>
            <Text className="text-surface-700 dark:text-surface-300 text-sm">
              {t('dashboard.reorderBody', { count: lowStockCount })}
            </Text>
            <AppPressable
              onPress={() => router.push('/(app)/(tabs)/purchasing')}
              accessibilityRole="button"
              accessibilityLabel={t('dashboard.reviewPurchaseList')}
              className="mt-3 bg-brand-700 rounded-full py-3 items-center active:opacity-80"
            >
              <Text className="text-white font-bold text-sm">{t('dashboard.reviewPurchaseList')}</Text>
            </AppPressable>
          </View>
        )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function CatalogPreviewRow({ product }: { product: CatalogProductDto }) {
  const { t, i18n } = useTranslation();
  const price = product.reference_price != null ? parseFloat(product.reference_price) : null;
  return (
    <AppPressable
      onPress={() => router.push('/(app)/(tabs)/purchasing')}
      accessibilityRole="button"
      accessibilityLabel={t('dashboard.catalogItemLabel', { name: product.name })}
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
        <Text className="text-brand-600 dark:text-brand-300 text-sm font-semibold">
          {t('dashboard.pricePerUnit', { price: formatRWF(price, i18n.language), unit: product.unit })}
        </Text>
      )}
    </AppPressable>
  );
}

