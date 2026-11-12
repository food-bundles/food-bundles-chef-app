import { useState, useMemo } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { RefreshCw, Plus, Package } from 'lucide-react-native';
import { useStockLevels } from '@/features/inventory/useStockLevels';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { SearchInput } from '@/components/ui/SearchInput';
import { StockIndicator } from '@/components/ui/StockIndicator';
import { SyncStatusBadge } from '@/components/ui/SyncStatusBadge';
import type { StockLevelDto } from '@/api/inventory-api';

type StockFilter = 'all' | 'in_stock' | 'out_of_stock';

export default function StockScreen() {
  const insets = useSafeAreaInsets();
  const { data: allItems = [], isLoading, refetch } = useStockLevels();
  const { phase, pendingCount, sync } = useSyncStatus();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StockFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  const outOfStockCount = useMemo(() => allItems.filter((i) => parseFloat(i.current_stock) === 0).length, [allItems]);
  const lowStockCount = useMemo(() => allItems.filter((i) => i.is_low_stock && parseFloat(i.current_stock) > 0).length, [allItems]);

  const items = useMemo(() => {
    let list = query.trim()
      ? allItems.filter((i) => i.ingredient_name.toLowerCase().includes(query.toLowerCase()))
      : allItems;
    if (filter === 'in_stock') list = list.filter((i) => parseFloat(i.current_stock) > 0);
    if (filter === 'out_of_stock') list = list.filter((i) => parseFloat(i.current_stock) === 0);
    return list.slice().sort((a, b) => {
      const da = a.days_cover != null ? parseFloat(a.days_cover) : Infinity;
      const db = b.days_cover != null ? parseFloat(b.days_cover) : Infinity;
      return da - db;
    });
  }, [allItems, query, filter]);

  async function handleSync() {
    await sync();
    void refetch();
  }

  return (
    <View className="flex-1 bg-surface-50 dark:bg-surface-900" style={{ paddingTop: insets.top }}>
      <View className="px-4 py-3 border-b border-surface-200 dark:border-surface-800 flex-row items-center justify-between">
        <Text className="text-surface-900 dark:text-white text-lg font-bold">Stock</Text>
        <View className="flex-row items-center gap-3">
          <SyncStatusBadge phase={phase} pendingCount={pendingCount} />
          <TouchableOpacity
            onPress={handleSync}
            disabled={phase === 'syncing'}
            accessibilityLabel="Sync now"
            hitSlop={8}
          >
            <RefreshCw
              size={18}
              color={phase === 'syncing' ? '#60A5FA' : '#9CA3AF'}
              strokeWidth={2}
            />
          </TouchableOpacity>
          <Pressable
            onPress={() => router.push('/(app)/ingredients/create' as never)}
            accessibilityRole="button"
            accessibilityLabel="Add ingredient"
            hitSlop={8}
          >
            <Plus size={22} color="#0E8438" strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>

      <View className="px-4 pt-3 pb-0 gap-3">
        <SearchInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search ingredients…"
        />
        <View className="flex-row gap-2 pb-2">
          {([
            ['all', 'All', allItems.length],
            ['in_stock', 'In Stock', allItems.length - outOfStockCount],
            ['out_of_stock', 'Out of Stock', outOfStockCount],
          ] as [StockFilter, string, number][]).map(([key, label, count]) => (
            <Pressable
              key={key}
              onPress={() => setFilter(key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: filter === key }}
              className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border ${filter === key ? 'bg-brand-500/10 border-brand-500/40' : 'bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-700'}`}
            >
              <Text className={`text-xs font-semibold ${filter === key ? 'text-brand-400' : 'text-surface-600 dark:text-surface-400'}`}>{label}</Text>
              <View className={`min-w-[18px] h-[18px] rounded-full items-center justify-center px-1 ${filter === key ? 'bg-brand-500/20' : 'bg-surface-200 dark:bg-surface-700'}`}>
                <Text className={`text-[10px] font-bold ${filter === key ? 'text-brand-400' : 'text-surface-500'}`}>{count}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1DB954" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.ingredient_id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 8 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0E8438" colors={['#0E8438']} />}
          renderItem={({ item }) => <StockRow item={item} />}
          ListEmptyComponent={
            query || filter !== 'all' ? (
              <View className="items-center py-10 px-6 gap-2">
                <Text className="text-surface-900 dark:text-white font-semibold text-base">
                  {filter === 'out_of_stock' ? 'No out-of-stock items' : filter === 'in_stock' ? 'No items in stock' : 'No results'}
                </Text>
                <Text className="text-surface-500 text-sm text-center">
                  {filter === 'out_of_stock' ? "Great — all ingredients have stock." : filter === 'in_stock' ? "All ingredients are currently out of stock." : "Try a different search term."}
                </Text>
              </View>
            ) : (
              <View className="items-center py-10 px-6 gap-4">
                <View className="w-16 h-16 rounded-full bg-brand-500/10 items-center justify-center">
                  <Package size={28} color="#0E8438" strokeWidth={1.75} />
                </View>
                <View className="items-center gap-1">
                  <Text className="text-surface-900 dark:text-white font-semibold text-base">No ingredients yet</Text>
                  <Text className="text-surface-500 text-sm text-center">
                    Add your ingredients to start tracking stock levels and purchase needs.
                  </Text>
                </View>
                <Pressable
                  onPress={() => router.push('/(app)/ingredients/create' as never)}
                  accessibilityRole="button"
                  accessibilityLabel="Add first ingredient"
                  className="bg-brand-500 rounded-xl px-6 py-3 flex-row items-center gap-2 active:opacity-80"
                >
                  <Plus size={16} color="#fff" strokeWidth={2.5} />
                  <Text className="text-white font-semibold text-sm">Add Ingredient</Text>
                </Pressable>
                <Text className="text-surface-400 text-xs text-center">
                  You can also ask the AI Assistant to add ingredients for you.
                </Text>
              </View>
            )
          }
        />
      )}
    </View>
  );
}

function StockRow({ item }: { item: StockLevelDto }) {
  const days = item.days_cover != null ? parseFloat(item.days_cover) : Infinity;
  const dailyUse = item.expected_daily_use != null ? parseFloat(item.expected_daily_use) : null;
  const stock = parseFloat(item.current_stock);
  const isOut = stock === 0;
  const coverLabel = isFinite(days) ? `${days.toFixed(1)} days cover` : 'unlimited cover';
  return (
    <Pressable
      onPress={() => router.push(`/(app)/ingredients/${item.ingredient_id}` as never)}
      accessibilityRole="button"
      accessibilityLabel={`${item.ingredient_name}: ${item.current_stock} ${item.unit} on hand, ${coverLabel}`}
      className={`rounded-xl p-4 flex-row items-center justify-between active:opacity-70 ${isOut ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50' : 'bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent'}`}
    >
      <View className="flex-1 mr-3">
        <View className="flex-row items-center gap-2">
          <Text className="text-surface-900 dark:text-white font-medium">{item.ingredient_name}</Text>
          {isOut && (
            <View className="bg-red-100 dark:bg-red-900/40 rounded px-1.5 py-0.5">
              <Text className="text-red-600 dark:text-red-400 text-[10px] font-bold uppercase tracking-wide">Out of Stock</Text>
            </View>
          )}
        </View>
        <Text className={`text-sm mt-0.5 ${isOut ? 'text-red-500 dark:text-red-400' : 'text-surface-600 dark:text-surface-400'}`}>
          {isOut ? 'No stock — reorder needed' : `${item.current_stock} ${item.unit} on hand`}
          {!isOut && dailyUse != null ? ` · ${dailyUse.toFixed(1)} ${item.unit}/day` : ''}
        </Text>
      </View>
      <StockIndicator daysOfCover={days} />
    </Pressable>
  );
}
