import { useState, useMemo } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { ShoppingCart, ChevronRight, Truck, Package, Share2, ClipboardList } from 'lucide-react-native';
import { AppPressable } from '@/components/ui/AppPressable';
import { ProductIcon } from '@/components/ui/ProductIcon';
import { SearchInput } from '@/components/ui/SearchInput';
import { QuantitySelector } from '@/components/ui/QuantitySelector';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StickyFooter } from '@/components/ui/StickyFooter';
import { KeyboardActionBar } from '@/components/ui/KeyboardActionBar';
import { FormActionRow, type FormAction } from '@/components/ui/FormActionButton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useKitchenStore } from '@/store/kitchen-store';
import { useOrders, useCreateOrder } from '@/features/orders/useOrders';
import { useCatalog, type CatalogProductDto } from '@/features/purchasing/useCatalog';
import { useKeyboardVisible } from '@/hooks/useKeyboardVisible';
import { formatDate, formatQuantity } from '@/lib/format';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/providers/ThemeProvider';

type Tab = 'catalog' | 'orders';

interface CartItem {
  product: CatalogProductDto;
  quantity: number;
}

const ORDER_STATUS_VARIANT: Record<string, 'success' | 'warning' | 'info' | 'neutral'> = {
  delivered: 'success',
  confirmed: 'info',
  submitted: 'warning',
  out_for_delivery: 'info',
  cancelled: 'neutral',
  draft: 'neutral',
};

function shortId(id: string): string {
  return id.slice(-6).toUpperCase();
}

export default function PurchasingScreen() {
  const { t, i18n } = useTranslation();
  const tk = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  const { data: apiOrders = [], isLoading: ordersLoading, refetch: refetchOrders } = useOrders();
  const { data: allCatalog = [], isLoading: catalogLoading, refetch: refetchCatalog } = useCatalog();
  const createOrder = useCreateOrder();
  const [refreshing, setRefreshing] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const catalogAvailable = activeKitchen?.catalogAvailable ?? false;
  // Kitchens outside Food Bundles' countries order manual items only: no catalogue tab.
  const [tab, setTab] = useState<Tab>(catalogAvailable ? 'catalog' : 'orders');
  const [catalogQuery, setCatalogQuery] = useState('');
  const [orderError, setOrderError] = useState<string | null>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchOrders(), refetchCatalog()]);
    setRefreshing(false);
  };

  const unitPrice = (p: CatalogProductDto) => (p.reference_price != null ? parseFloat(p.reference_price) : 0);
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);
  const cartTotal = cart.reduce((s, c) => s + c.quantity * unitPrice(c.product), 0);
  // Catalogue reference prices share one currency (FOOD_BUNDLES_CATALOG_CURRENCY).
  const catalogCurrency = cart[0]?.product.reference_price_currency ?? '';

  const handleShareRequisition = async () => {
    if (cart.length === 0) return;
    const lines = cart
      .map((c) =>
        t('purchasing.shareLine', {
          name: c.product.name,
          qty: formatQuantity(c.quantity, i18n.language),
          unit: c.product.unit,
          price: formatMoney(unitPrice(c.product), c.product.reference_price_currency ?? '', i18n.language),
          total: formatMoney(unitPrice(c.product) * c.quantity, c.product.reference_price_currency ?? '', i18n.language),
        }),
      )
      .join('\n');
    const text = [
      t('purchasing.shareTitle'),
      t('purchasing.shareKitchen', { name: activeKitchen?.name ?? '' }),
      t('purchasing.shareDate', { date: formatDate(new Date(), i18n.language) }),
      '',
      t('purchasing.shareItems'),
      lines,
      '',
      t('purchasing.shareTotal', { total: formatMoney(cartTotal, catalogCurrency, i18n.language) }),
      '',
      t('purchasing.shareFooter'),
    ].join('\n');
    await Share.share({ message: text, title: t('purchasing.shareTitle') });
  };

  const catalogItems = useMemo(() => {
    const q = catalogQuery.toLowerCase().trim();
    return allCatalog.filter((p) => p.is_active && (!q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)));
  }, [allCatalog, catalogQuery]);

  const setCartQty = (product: CatalogProductDto, quantity: number) => {
    setOrderError(null);
    setCart((prev) => {
      if (quantity <= 0) return prev.filter((c) => c.product.id !== product.id);
      const idx = prev.findIndex((c) => c.product.id === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { product, quantity };
        return next;
      }
      return [...prev, { product, quantity }];
    });
  };

  const handleSubmitOrder = async () => {
    if (!activeKitchen || cart.length === 0) return;
    setOrderError(null);
    try {
      await createOrder.mutateAsync({
        lines: cart.map((c) => ({
          catalog_product_id: c.product.id,
          product_name: c.product.name,
          unit: c.product.unit,
          quantity_ordered: String(c.quantity),
          unit_price: c.product.reference_price ?? '0',
          ingredient_id: null,
        })),
      });
      setCart([]);
      setTab('orders');
    } catch {
      setOrderError(t('purchasing.orderError'));
    }
  };

  const checkoutActions: FormAction[] = [
    {
      kind: 'create',
      label: createOrder.isPending ? t('purchasing.placingOrder') : t('purchasing.orderFromFoodBundles'),
      onPress: () => void handleSubmitOrder(),
      loading: createOrder.isPending,
    },
  ];

  const shareOrder = (order: (typeof apiOrders)[number]) => {
    const text = [
      t('purchasing.orderShareTitle'),
      t('purchasing.orderNumber', { id: shortId(order.id) }),
      t('purchasing.shareKitchen', { name: activeKitchen?.name ?? '' }),
      t('purchasing.orderShareStatus', { status: t(`orders.status.${order.status}`) }),
      t('purchasing.shareDate', { date: formatDate(order.created_at, i18n.language) }),
      order.delivery_date ? t('purchasing.orderShareDelivery', { date: formatDate(order.delivery_date, i18n.language) }) : '',
      '',
      t('purchasing.orderShareFooter'),
    ]
      .filter(Boolean)
      .join('\n');
    void Share.share({ message: text, title: t('purchasing.orderNumber', { id: shortId(order.id) }) });
  };

  return (
    <View className="flex-1 bg-surface-50 dark:bg-surface-900" style={{ paddingTop: insets.top }}>
      <View className="px-4 py-3 flex-row items-center justify-between border-b border-surface-200 dark:border-surface-800">
        <Text className="text-surface-900 dark:text-white text-lg font-bold" accessibilityRole="header">
          {t('purchasing.title')}
        </Text>
        {cartCount > 0 && (
          <AppPressable
            onPress={() => setTab('catalog')}
            accessibilityRole="button"
            accessibilityLabel={t('purchasing.cartLabel', { count: cartCount })}
            className="bg-brand-500 rounded-lg px-3 flex-row items-center gap-1"
            style={{ minHeight: 36 }}
          >
            <ShoppingCart size={14} color={tk.onPrimary} strokeWidth={2} />
            <Text className="text-white text-xs font-bold">{cartCount}</Text>
          </AppPressable>
        )}
      </View>

      <View className="flex-row border-b border-surface-200 dark:border-surface-800" accessibilityRole="tablist">
        {(
          (catalogAvailable
            ? [['catalog', t('purchasing.catalog')], ['orders', t('purchasing.orders')]]
            : [['orders', t('purchasing.orders')]]) as [Tab, string][]
        ).map(([key, label]) => (
          <AppPressable
            key={key}
            onPress={() => setTab(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === key }}
            className={`flex-1 py-3 items-center ${tab === key ? 'border-b-2 border-brand-500' : ''}`}
          >
            <Text className={`text-sm font-medium ${tab === key ? 'text-brand-600 dark:text-brand-300' : 'text-surface-600 dark:text-surface-400'}`}>
              {label}
            </Text>
          </AppPressable>
        ))}
      </View>

      {tab === 'catalog' && catalogAvailable && (
        <View className="flex-1">
          {cartCount > 0 ? <KeyboardActionBar actions={checkoutActions} visible={keyboardVisible} /> : null}
          <View className="px-4 py-3">
            <SearchInput value={catalogQuery} onChangeText={setCatalogQuery} placeholder={t('purchasing.searchProducts')} />
          </View>
          {catalogLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color={tk.primary} />
            </View>
          ) : (
            <FlatList
              data={catalogItems}
              keyExtractor={(p) => p.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 32 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tk.primary} colors={[tk.primary]} />}
              renderItem={({ item }) => (
                <CatalogRow
                  product={item}
                  qty={cart.find((c) => c.product.id === item.id)?.quantity ?? 0}
                  onQtyChange={(q) => setCartQty(item, q)}
                />
              )}
              ListEmptyComponent={
                <EmptyState
                  Icon={Package}
                  title={catalogQuery ? t('purchasing.noProductsFound') : t('purchasing.noCatalogTitle')}
                  description={catalogQuery ? t('purchasing.tryDifferentSearch') : t('purchasing.noCatalogBody')}
                  actionLabel={catalogQuery ? undefined : t('purchasing.logDeliveryManually')}
                  onAction={catalogQuery ? undefined : () => router.push('/(app)/receiving/quick')}
                />
              }
            />
          )}
          {cartCount > 0 && !keyboardVisible && (
            <StickyFooter>
              <View className="flex-row items-center justify-between">
                <Text style={{ color: tk.textMuted, fontSize: 13 }}>
                  {t('purchasing.cartSummary', { count: cartCount, total: formatMoney(cartTotal, catalogCurrency, i18n.language) })}
                </Text>
                <AppPressable
                  onPress={() => void handleShareRequisition()}
                  accessibilityRole="button"
                  accessibilityLabel={t('purchasing.shareRequisition')}
                  className="flex-row items-center gap-1.5 px-3 rounded-lg bg-surface-200 dark:bg-surface-800"
                  style={{ minHeight: 36 }}
                >
                  <Share2 size={13} color={tk.textMuted} strokeWidth={2} />
                  <Text style={{ color: tk.textMuted, fontSize: 12, fontWeight: '500' }}>{t('purchasing.share')}</Text>
                </AppPressable>
              </View>
              {orderError ? (
                <Text style={{ color: tk.danger, fontSize: 13 }} accessibilityRole="alert">{orderError}</Text>
              ) : null}
              <FormActionRow actions={checkoutActions} placement="footer" />
            </StickyFooter>
          )}
        </View>
      )}

      {tab === 'orders' &&
        (ordersLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={tk.primary} />
          </View>
        ) : (
          <FlatList
            data={apiOrders}
            ListHeaderComponent={
              <AppPressable
                onPress={() => router.push('/(app)/receiving' as never)}
                accessibilityRole="button"
                className="bg-brand-50 dark:bg-surface-800 border border-brand-500/30 rounded-xl p-4 flex-row items-center justify-between mb-2"
              >
                <View className="flex-row items-center gap-2">
                  <Truck size={16} color={tk.link} strokeWidth={2} />
                  <Text className="text-brand-600 dark:text-brand-300 font-semibold text-sm">{t('purchasing.deliveryReceiving')}</Text>
                </View>
                <ChevronRight size={16} color={tk.link} strokeWidth={2} />
              </AppPressable>
            }
            keyExtractor={(o) => o.id}
            contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 96 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tk.primary} colors={[tk.primary]} />}
            renderItem={({ item: order }) => (
              <View className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl overflow-hidden">
                <AppPressable
                  onPress={() => router.push(`/(app)/orders/${order.id}` as never)}
                  accessibilityRole="button"
                  accessibilityLabel={t('purchasing.orderNumber', { id: shortId(order.id) })}
                  className="p-4"
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-surface-900 dark:text-white font-semibold text-sm">
                      {t('purchasing.orderNumber', { id: shortId(order.id) })}
                    </Text>
                    <View className="flex-row items-center gap-2">
                      <StatusBadge label={t(`orders.status.${order.status}`)} variant={ORDER_STATUS_VARIANT[order.status] ?? 'neutral'} />
                      <ChevronRight size={16} color={tk.textMuted} strokeWidth={2} />
                    </View>
                  </View>
                  {order.delivery_date ? (
                    <Text className="text-surface-600 dark:text-surface-400 text-xs mb-1">
                      {t('purchasing.deliveryOn', { date: formatDate(order.delivery_date, i18n.language) })}
                    </Text>
                  ) : null}
                  <Text className="text-surface-600 dark:text-surface-400 text-xs">
                    {t('purchasing.createdOn', { date: formatDate(order.created_at, i18n.language) })}
                  </Text>
                </AppPressable>
                <AppPressable
                  onPress={() => shareOrder(order)}
                  accessibilityRole="button"
                  accessibilityLabel={t('purchasing.shareOrderLabel', { id: shortId(order.id) })}
                  className="border-t border-surface-100 dark:border-surface-700 px-4 flex-row items-center gap-1.5"
                  style={{ minHeight: 44 }}
                >
                  <Share2 size={12} color={tk.textMuted} strokeWidth={2} />
                  <Text className="text-surface-600 dark:text-surface-400 text-xs font-medium">{t('purchasing.shareRequisition')}</Text>
                </AppPressable>
              </View>
            )}
            ListEmptyComponent={
              allCatalog.length > 0 ? (
                <EmptyState
                  Icon={ClipboardList}
                  title={t('purchasing.noOrdersTitle')}
                  description={t('purchasing.noOrdersDesc')}
                  actionLabel={t('purchasing.browseCatalog')}
                  onAction={() => setTab('catalog')}
                />
              ) : (
                <EmptyState
                  Icon={ClipboardList}
                  title={t('purchasing.noOrdersTitle')}
                  description={t('purchasing.noCatalogDesc')}
                  actionLabel={t('purchasing.logDeliveryManually')}
                  onAction={() => router.push('/(app)/receiving/quick')}
                />
              )
            }
          />
        ))}
    </View>
  );
}

function CatalogRow({ product, qty, onQtyChange }: { product: CatalogProductDto; qty: number; onQtyChange: (q: number) => void }) {
  const { t, i18n } = useTranslation();
  const price = product.reference_price != null ? parseFloat(product.reference_price) : null;
  return (
    <View className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl p-4">
      <View className="flex-row items-start mb-3 gap-3">
        <ProductIcon imageUrl={product.image_url} category={product.category} productName={product.name} size="md" />
        <View className="flex-1">
          <Text className="text-surface-900 dark:text-white font-medium">{product.name}</Text>
          <Text className="text-surface-600 dark:text-surface-400 text-xs mt-0.5 capitalize">{product.category}</Text>
          {price != null ? (
            <Text className="text-brand-600 dark:text-brand-300 text-sm font-semibold mt-1">
              {formatMoney(price, product.reference_price_currency ?? '', i18n.language)}/{product.unit}
            </Text>
          ) : (
            <Text className="text-surface-600 dark:text-surface-400 text-sm mt-1">{t('purchasing.priceTbc')}</Text>
          )}
        </View>
      </View>
      <QuantitySelector
        value={qty}
        onDecrement={() => onQtyChange(Math.max(0, qty - 1))}
        onIncrement={() => onQtyChange(qty + 1)}
        unit={product.unit}
        accessibilityLabel={t('purchasing.qtyLabel', { name: product.name })}
      />
    </View>
  );
}
