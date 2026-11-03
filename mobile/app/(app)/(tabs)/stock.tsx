import { useState, useMemo } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RefreshCw } from 'lucide-react-native';
import { useStockLevels } from '@/features/inventory/useStockLevels';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { SearchInput } from '@/components/ui/SearchInput';
import { StockIndicator } from '@/components/ui/StockIndicator';
import { SyncStatusBadge } from '@/components/ui/SyncStatusBadge';
import { EmptyState } from '@/components/feedback/EmptyState';
import type { StockLevelDto } from '@/api/inventory-api';

export default function StockScreen() {
  const insets = useSafeAreaInsets();
  const { data: allItems = [], isLoading, refetch } = useStockLevels();
  const { phase, pendingCount, sync } = useSyncStatus();
  const [query, setQuery] = useState('');

  const items = useMemo(() => {
    const filtered = query.trim()
      ? allItems.filter((i) =>
          i.ingredient_name.toLowerCase().includes(query.toLowerCase()),
        )
      : allItems;
    return filtered.slice().sort((a, b) => {
      const da = a.days_cover != null ? parseFloat(a.days_cover) : Infinity;
      const db = b.days_cover != null ? parseFloat(b.days_cover) : Infinity;
      return da - db;
    });
  }, [allItems, query]);

  async function handleSync() {
    await sync();
    void refetch();
  }

  return (
    <View className="flex-1 bg-surface-900" style={{ paddingTop: insets.top }}>
      <View className="px-4 py-3 border-b border-surface-800 flex-row items-center justify-between">
        <Text className="text-white text-lg font-bold">Stock</Text>
        <View className="flex-row items-center gap-2">
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
        </View>
      </View>

      <View className="px-4 py-3">
        <SearchInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search ingredients…"
        />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#fff" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.ingredient_id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 8 }}
          renderItem={({ item }) => <StockRow item={item} />}
          ListEmptyComponent={
            <EmptyState
              title={query ? 'No results' : 'No ingredients tracked'}
              description={
                query
                  ? 'Try a different search.'
                  : 'Stock data will appear after receiving deliveries.'
              }
            />
          }
        />
      )}
    </View>
  );
}

function StockRow({ item }: { item: StockLevelDto }) {
  const days = item.days_cover != null ? parseFloat(item.days_cover) : Infinity;
  const dailyUse = item.expected_daily_use != null ? parseFloat(item.expected_daily_use) : null;
  const coverLabel = isFinite(days) ? `${days.toFixed(1)} days cover` : 'unlimited cover';
  return (
    <View
      className="bg-surface-800 rounded-xl p-4 flex-row items-center justify-between"
      accessibilityRole="text"
      accessibilityLabel={`${item.ingredient_name}: ${item.current_stock} ${item.unit} on hand, ${coverLabel}`}
    >
      <View className="flex-1 mr-3">
        <Text className="text-white font-medium">{item.ingredient_name}</Text>
        <Text className="text-surface-400 text-sm mt-0.5">
          {item.current_stock} {item.unit} on hand
          {dailyUse != null ? ` · ${dailyUse.toFixed(2)} ${item.unit}/day use` : ''}
        </Text>
      </View>
      <StockIndicator daysOfCover={days} />
    </View>
  );
}
