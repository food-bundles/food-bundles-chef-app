import { useState, useMemo } from 'react';
import { View, Text, FlatList, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ShoppingCart, TrendingDown } from 'lucide-react-native';
import { useKitchenStore } from '@/store/kitchen-store';
import { useStockStore } from '@/store/stock-store';
import { useOrderStore } from '@/store/order-store';
import { SearchInput } from '@/components/ui/SearchInput';
import { StockIndicator } from '@/components/ui/StockIndicator';
import { QuantitySelector } from '@/components/ui/QuantitySelector';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/feedback/EmptyState';
import { MOCK_CATALOG } from '@/data/mock/catalog-mock';
import { calcDaysOfCover } from '@/domain/calculations/expected-use';
import { calcQuantityToBuy } from '@/domain/calculations/purchasing';
import type { StockItem } from '@/domain/models/stock-item';
import type { CatalogProduct } from '@/domain/models/catalog-product';
import { colors } from '@/lib/theme';

type Tab = 'needs' | 'catalog' | 'orders';

const TARGET_DAYS_COVER = 3;

const ORDER_STATUS_VARIANT: Record<string, 'success' | 'warning' | 'info' | 'neutral'> = {
  delivered: 'success',
  confirmed: 'info',
  submitted: 'warning',
  out_for_delivery: 'info',
  cancelled: 'neutral',
  draft: 'neutral',
};

export default function PurchasingScreen() {
  const insets = useSafeAreaInsets();
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  const allStock = useStockStore((s) => s.items);
  const orders = useOrderStore((s) => s.orders);
  const cart = useOrderStore((s) => s.cart);
  const setCartQty = useOrderStore((s) => s.setCartQuantity);
  const submitOrder = useOrderStore((s) => s.submitOrder);
  const cartTotal = useOrderStore((s) => s.cartTotal);
  const [tab, setTab] = useState<Tab>('needs');
  const [catalogQuery, setCatalogQuery] = useState('');

  const kitchenId = activeKitchen?.id ?? '';

  const purchaseList = useMemo(() => {
    const kitchenItems = allStock.filter((i) => i.kitchenId === kitchenId);
    return kitchenItems
      .map((item) => {
        const days = calcDaysOfCover(item.quantityOnHand, item.dailyUseRate);
        const targetStock = item.dailyUseRate * TARGET_DAYS_COVER;
        const qtyToBuy = item.dailyUseRate > 0
          ? calcQuantityToBuy(targetStock, item.quantityOnHand)
          : 0;
        return { ...item, daysOfCover: days, qtyToBuy };
      })
      .filter((i) => i.qtyToBuy > 0)
      .sort((a, b) => a.daysOfCover - b.daysOfCover);
  }, [allStock, kitchenId]);

  const catalogItems = useMemo(() => {
    const q = catalogQuery.toLowerCase().trim();
    return MOCK_CATALOG.filter(
      (p) => !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q),
    );
  }, [catalogQuery]);

  const kitchenOrders = orders.filter((o) => o.kitchenId === kitchenId);
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  const handleSubmitOrder = () => {
    if (!kitchenId || cart.length === 0) return;
    submitOrder(kitchenId);
  };

  return (
    <View className="flex-1 bg-surface-900" style={{ paddingTop: insets.top }}>
      <View className="px-4 py-3 flex-row items-center justify-between border-b border-surface-800">
        <Text className="text-white text-lg font-bold">Purchasing</Text>
        {cartCount > 0 && (
          <Pressable
            onPress={() => setTab('catalog')}
            accessibilityRole="button"
            accessibilityLabel={`Cart: ${cartCount} items`}
            className="bg-brand-500 rounded-lg px-3 py-1.5 flex-row items-center gap-1"
          >
            <ShoppingCart size={14} color="#fff" strokeWidth={2} />
            <Text className="text-white text-xs font-bold">{cartCount}</Text>
          </Pressable>
        )}
      </View>

      {/* Tab bar */}
      <View className="flex-row border-b border-surface-800">
        {([['needs', 'Need to Buy'], ['catalog', 'Catalog'], ['orders', 'Orders']] as [Tab, string][]).map(
          ([key, label]) => (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === key }}
              className={`flex-1 py-3 items-center ${tab === key ? 'border-b-2 border-brand-500' : ''}`}
            >
              <Text className={`text-sm font-medium ${tab === key ? 'text-brand-400' : 'text-surface-500'}`}>
                {label}
              </Text>
            </Pressable>
          ),
        )}
      </View>

      {/* Need-to-buy tab */}
      {tab === 'needs' && (
        <FlatList
          data={purchaseList}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 32 }}
          renderItem={({ item }) => <NeedsRow item={item} />}
          ListEmptyComponent={
            <EmptyState
              title="Purchase list is clear"
              description="All ingredients are stocked for the next 3 days."
            />
          }
        />
      )}

      {/* Catalog tab */}
      {tab === 'catalog' && (
        <View className="flex-1">
          <View className="px-4 py-3">
            <SearchInput value={catalogQuery} onChangeText={setCatalogQuery} placeholder="Search products…" />
          </View>
          <FlatList
            data={catalogItems}
            keyExtractor={(p) => p.id}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: cartCount > 0 ? 120 : 32 }}
            renderItem={({ item }) => {
              const cartItem = cart.find((c) => c.product.id === item.id);
              return (
                <CatalogRow
                  product={item}
                  qty={cartItem?.quantity ?? 0}
                  onQtyChange={(q) => setCartQty(item, q)}
                />
              );
            }}
          />
          {cartCount > 0 && (
            <View className="absolute bottom-0 left-0 right-0 px-4 pb-6 bg-surface-950/95">
              <View className="mt-3 mb-2 flex-row items-center justify-between">
                <Text className="text-surface-400 text-sm">
                  {cartCount} item{cartCount > 1 ? 's' : ''} · {cartTotal().toLocaleString()} RWF
                </Text>
              </View>
              <Pressable
                onPress={handleSubmitOrder}
                accessibilityRole="button"
                accessibilityLabel="Place order with Food Bundles"
                className="bg-brand-500 rounded-xl py-4 items-center flex-row justify-center gap-2 active:opacity-80"
              >
                <ShoppingCart size={18} color="#fff" strokeWidth={2} />
                <Text className="text-white font-semibold">Place Order</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {/* Orders tab */}
      {tab === 'orders' && (
        <FlatList
          data={kitchenOrders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 32 }}
          renderItem={({ item: order }) => (
            <View className="bg-surface-800 rounded-xl p-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-white font-semibold text-sm">Order #{order.id.slice(-4)}</Text>
                <StatusBadge
                  label={order.status.replace('_', ' ')}
                  variant={ORDER_STATUS_VARIANT[order.status] ?? 'neutral'}
                />
              </View>
              <Text className="text-surface-400 text-xs mb-1">
                {order.lineItems.length} item{order.lineItems.length > 1 ? 's' : ''} · {order.totalRwf.toLocaleString()} RWF
              </Text>
              {order.placedAt && (
                <Text className="text-surface-500 text-xs">
                  Placed {new Date(order.placedAt).toLocaleDateString()}
                </Text>
              )}
            </View>
          )}
          ListEmptyComponent={
            <EmptyState title="No orders yet" description="Browse the catalog to place your first order." />
          }
        />
      )}
    </View>
  );
}

function NeedsRow({ item }: { item: StockItem & { daysOfCover: number; qtyToBuy: number } }) {
  return (
    <View className="bg-surface-800 rounded-xl p-4 flex-row items-center justify-between">
      <View className="flex-1 mr-3">
        <Text className="text-white font-medium">{item.ingredientName}</Text>
        <Text className="text-surface-400 text-sm mt-0.5">
          On hand: {item.quantityOnHand} {item.unit}
        </Text>
        <Text className="text-brand-400 text-sm font-semibold mt-1">
          Suggested: {item.qtyToBuy} {item.unit}
        </Text>
      </View>
      <StockIndicator daysOfCover={item.daysOfCover} />
    </View>
  );
}

function CatalogRow({
  product,
  qty,
  onQtyChange,
}: {
  product: CatalogProduct;
  qty: number;
  onQtyChange: (q: number) => void;
}) {
  return (
    <View className={`bg-surface-800 rounded-xl p-4 ${!product.inStock ? 'opacity-50' : ''}`}>
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1 mr-3">
          <Text className="text-white font-medium">{product.name}</Text>
          <Text className="text-surface-400 text-xs mt-0.5">
            {product.category} · {product.packSize} {product.unit} / pack
          </Text>
          <Text className="text-surface-300 text-sm font-semibold mt-1">
            {product.unitPriceRwf.toLocaleString()} RWF/{product.unit}
          </Text>
        </View>
        {!product.inStock && <StatusBadge label="Out of stock" variant="neutral" />}
      </View>
      {product.inStock && (
        <QuantitySelector
          value={qty}
          onDecrement={() => onQtyChange(Math.max(0, qty - product.packSize))}
          onIncrement={() => onQtyChange(qty + product.packSize)}
          unit={product.unit}
          accessibilityLabel={`${product.name} quantity`}
        />
      )}
    </View>
  );
}
