import { useState, useMemo } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShoppingCart } from 'lucide-react-native';
import { useKitchenStore } from '@/store/kitchen-store';
import { usePurchaseSuggestions } from '@/features/purchasing/usePurchaseSuggestions';
import { useOrders, useCreateOrder, useSubmitOrder } from '@/features/orders/useOrders';
import { SearchInput } from '@/components/ui/SearchInput';
import { StockIndicator } from '@/components/ui/StockIndicator';
import { QuantitySelector } from '@/components/ui/QuantitySelector';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useCatalog, type CatalogProductDto } from '@/features/purchasing/useCatalog';
import type { PurchaseSuggestionDto } from '@/api/purchasing-api';

type Tab = 'needs' | 'catalog' | 'orders';

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

export default function PurchasingScreen() {
  const insets = useSafeAreaInsets();
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  const { data: suggestionsResp, isLoading: suggestionsLoading } = usePurchaseSuggestions();
  const { data: apiOrders = [], isLoading: ordersLoading } = useOrders();
  const { data: allCatalog = [], isLoading: catalogLoading } = useCatalog();
  const createOrder = useCreateOrder();
  const submitOrderMutation = useSubmitOrder();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [tab, setTab] = useState<Tab>('needs');
  const [catalogQuery, setCatalogQuery] = useState('');

  const purchaseList = useMemo(
    () => (suggestionsResp?.suggestions ?? []).filter((s) => parseFloat(s.suggested_qty) > 0),
    [suggestionsResp],
  );

  const catalogItems = useMemo(() => {
    const q = catalogQuery.toLowerCase().trim();
    return allCatalog.filter(
      (p) => p.is_active && (!q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)),
    );
  }, [allCatalog, catalogQuery]);

  const setCartQty = (product: CatalogProductDto, quantity: number) => {
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

  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);
  const cartTotal = cart.reduce(
    (s, c) => s + c.quantity * (c.product.reference_price != null ? parseFloat(c.product.reference_price) : 0),
    0,
  );

  const handleSubmitOrder = async () => {
    if (!activeKitchen || cart.length === 0) return;
    const lines = cart.map((c) => ({
      catalog_product_id: c.product.id,
      product_name: c.product.name,
      unit: c.product.unit,
      quantity_ordered: String(c.quantity),
      unit_price: c.product.reference_price ?? '0',
      ingredient_id: null,
    }));
    const created = await createOrder.mutateAsync({ lines });
    await submitOrderMutation.mutateAsync(created.id);
    setCart([]);
    setTab('orders');
  };

  const isPlacingOrder = createOrder.isPending || submitOrderMutation.isPending;

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
        suggestionsLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#fff" />
          </View>
        ) : (
          <FlatList
            data={purchaseList}
            keyExtractor={(i) => i.ingredient_id}
            contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 32 }}
            renderItem={({ item }) => <NeedsRow item={item} />}
            ListEmptyComponent={
              <EmptyState
                title="Purchase list is clear"
                description="All ingredients are stocked for the next 3 days."
              />
            }
          />
        )
      )}

      {/* Catalog tab */}
      {tab === 'catalog' && (
        <View className="flex-1">
          <View className="px-4 py-3">
            <SearchInput value={catalogQuery} onChangeText={setCatalogQuery} placeholder="Search products…" />
          </View>
          {catalogLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="#fff" />
            </View>
          ) : (
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
            ListEmptyComponent={
              <EmptyState title="No products found" description="Try a different search term." />
            }
          />
          )}
          {cartCount > 0 && (
            <View className="absolute bottom-0 left-0 right-0 px-4 pb-6 bg-surface-950/95">
              <View className="mt-3 mb-2 flex-row items-center justify-between">
                <Text className="text-surface-400 text-sm">
                  {cartCount} item{cartCount > 1 ? 's' : ''} · {cartTotal.toLocaleString()} RWF
                </Text>
              </View>
              <Pressable
                onPress={handleSubmitOrder}
                disabled={isPlacingOrder}
                accessibilityRole="button"
                accessibilityLabel="Place order with Food Bundles"
                className={`rounded-xl py-4 items-center flex-row justify-center gap-2 active:opacity-80 ${isPlacingOrder ? 'bg-surface-700' : 'bg-brand-500'}`}
              >
                <ShoppingCart size={18} color="#fff" strokeWidth={2} />
                <Text className="text-white font-semibold">
                  {isPlacingOrder ? 'Placing Order…' : 'Place Order'}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {/* Orders tab */}
      {tab === 'orders' && (
        ordersLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#fff" />
          </View>
        ) : (
          <FlatList
            data={apiOrders}
            keyExtractor={(o) => o.id}
            contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 32 }}
            renderItem={({ item: order }) => (
              <View className="bg-surface-800 rounded-xl p-4">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-white font-semibold text-sm">Order #{order.id.slice(-4)}</Text>
                  <StatusBadge
                    label={order.status.replace(/_/g, ' ')}
                    variant={ORDER_STATUS_VARIANT[order.status] ?? 'neutral'}
                  />
                </View>
                {order.delivery_date && (
                  <Text className="text-surface-400 text-xs mb-1">
                    Delivery {new Date(order.delivery_date).toLocaleDateString()}
                  </Text>
                )}
                <Text className="text-surface-500 text-xs">
                  Created {new Date(order.created_at).toLocaleDateString()}
                </Text>
              </View>
            )}
            ListEmptyComponent={
              <EmptyState title="No orders yet" description="Browse the catalog to place your first order." />
            }
          />
        )
      )}
    </View>
  );
}

function NeedsRow({ item }: { item: PurchaseSuggestionDto }) {
  const days = item.days_cover != null ? parseFloat(item.days_cover) : Infinity;
  return (
    <View className="bg-surface-800 rounded-xl p-4 flex-row items-center justify-between">
      <View className="flex-1 mr-3">
        <Text className="text-white font-medium">{item.ingredient_name}</Text>
        <Text className="text-surface-400 text-sm mt-0.5">
          On hand: {item.current_stock} {item.unit}
        </Text>
        <Text className="text-brand-400 text-sm font-semibold mt-1">
          Suggested: {item.suggested_qty} {item.unit}
        </Text>
      </View>
      <StockIndicator daysOfCover={days} />
    </View>
  );
}

function CatalogRow({
  product,
  qty,
  onQtyChange,
}: {
  product: CatalogProductDto;
  qty: number;
  onQtyChange: (q: number) => void;
}) {
  const price = product.reference_price != null ? parseFloat(product.reference_price) : null;
  return (
    <View className="bg-surface-800 rounded-xl p-4">
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1 mr-3">
          <Text className="text-white font-medium">{product.name}</Text>
          <Text className="text-surface-400 text-xs mt-0.5">{product.category}</Text>
          {price != null ? (
            <Text className="text-surface-300 text-sm font-semibold mt-1">
              {price.toLocaleString()} RWF/{product.unit}
            </Text>
          ) : (
            <Text className="text-surface-500 text-sm mt-1">Price TBC</Text>
          )}
        </View>
      </View>
      <QuantitySelector
        value={qty}
        onDecrement={() => onQtyChange(Math.max(0, qty - 1))}
        onIncrement={() => onQtyChange(qty + 1)}
        unit={product.unit}
        accessibilityLabel={`${product.name} quantity`}
      />
    </View>
  );
}
