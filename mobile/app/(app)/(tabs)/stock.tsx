import { useState, useMemo } from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKitchenStore } from '@/store/kitchen-store';
import { useStockStore } from '@/store/stock-store';
import { SearchInput } from '@/components/ui/SearchInput';
import { StockIndicator } from '@/components/ui/StockIndicator';
import { EmptyState } from '@/components/feedback/EmptyState';
import { calcDaysOfCover } from '@/domain/calculations/expected-use';
import type { StockItem } from '@/domain/models/stock-item';

export default function StockScreen() {
  const insets = useSafeAreaInsets();
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  const allItems = useStockStore((s) => s.items);
  const [query, setQuery] = useState('');

  const items = useMemo(() => {
    const kitchenItems = allItems.filter((i) => i.kitchenId === activeKitchen?.id);
    const filtered = query.trim()
      ? kitchenItems.filter((i) =>
          i.ingredientName.toLowerCase().includes(query.toLowerCase()),
        )
      : kitchenItems;
    return filtered.sort(
      (a, b) =>
        calcDaysOfCover(a.quantityOnHand, a.dailyUseRate) -
        calcDaysOfCover(b.quantityOnHand, b.dailyUseRate),
    );
  }, [allItems, activeKitchen?.id, query]);

  return (
    <View className="flex-1 bg-surface-900" style={{ paddingTop: insets.top }}>
      <View className="px-4 py-3 border-b border-surface-800">
        <Text className="text-white text-lg font-bold">Stock</Text>
        {activeKitchen ? (
          <Text className="text-surface-400 text-xs mt-0.5">{activeKitchen.name}</Text>
        ) : null}
      </View>

      <View className="px-4 py-3">
        <SearchInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search ingredients…"
        />
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 8 }}
        renderItem={({ item }) => <StockRow item={item} />}
        ListEmptyComponent={
          <EmptyState
            title={query ? 'No results' : 'No ingredients tracked'}
            description={query ? 'Try a different search.' : 'Stock data will appear after receiving deliveries.'}
          />
        }
      />
    </View>
  );
}

function StockRow({ item }: { item: StockItem }) {
  const days = calcDaysOfCover(item.quantityOnHand, item.dailyUseRate);
  return (
    <View className="bg-surface-800 rounded-xl p-4 flex-row items-center justify-between">
      <View className="flex-1 mr-3">
        <Text className="text-white font-medium">{item.ingredientName}</Text>
        <Text className="text-surface-400 text-sm mt-0.5">
          {item.quantityOnHand} {item.unit} on hand · {item.dailyUseRate} {item.unit}/day use
        </Text>
      </View>
      <StockIndicator daysOfCover={days} />
    </View>
  );
}
