import { useState, useMemo } from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Plus, ClipboardList } from 'lucide-react-native';
import { useKitchenStore } from '@/store/kitchen-store';
import { useMenuStore } from '@/store/menu-store';
import { SearchInput } from '@/components/ui/SearchInput';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState } from '@/components/feedback/EmptyState';
import type { MenuItem } from '@/domain/models/menu-item';

const CATEGORIES = ['All', 'Main', 'Side', 'Drink', 'Dessert'];

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  const allItems = useMenuStore((s) => s.items);
  const toggleActive = useMenuStore((s) => s.toggleActive);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  const items = useMemo(() => {
    return allItems
      .filter((i) => i.kitchenId === activeKitchen?.id)
      .filter((i) => category === 'All' || i.category === category)
      .filter((i) =>
        query.trim()
          ? i.name.toLowerCase().includes(query.toLowerCase())
          : true,
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allItems, activeKitchen?.id, query, category]);

  return (
    <View className="flex-1 bg-surface-900" style={{ paddingTop: insets.top }}>
      <View className="px-4 py-3 flex-row items-center justify-between border-b border-surface-800">
        <Text className="text-white text-lg font-bold">Menu</Text>
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => router.push('/(app)/sales/entry')}
            accessibilityRole="button"
            accessibilityLabel="Record sales"
            className="w-10 h-10 items-center justify-center rounded-xl bg-surface-700"
          >
            <ClipboardList size={18} color="#B3B0A6" strokeWidth={1.75} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add menu item"
            className="w-10 h-10 items-center justify-center rounded-xl bg-brand-500"
          >
            <Plus size={20} color="#fff" strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>

      <View className="px-4 py-3 gap-3">
        <SearchInput value={query} onChangeText={setQuery} placeholder="Search menu…" />
        <View className="flex-row gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              onPress={() => setCategory(cat)}
              accessibilityRole="button"
              accessibilityLabel={cat}
              className={`px-3 py-1.5 rounded-full ${category === cat ? 'bg-brand-500' : 'bg-surface-800'}`}
            >
              <Text className={`text-xs font-medium ${category === cat ? 'text-white' : 'text-surface-400'}`}>
                {cat}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 8 }}
        renderItem={({ item }) => (
          <MenuItemRow item={item} onToggle={() => toggleActive(item.id)} />
        )}
        ListEmptyComponent={
          <EmptyState
            title={query ? 'No results' : 'No menu items yet'}
            description={query ? 'Try a different search.' : 'Add your first item with the + button.'}
          />
        }
      />
    </View>
  );
}

function MenuItemRow({
  item,
  onToggle,
}: {
  item: MenuItem;
  onToggle: () => void;
}) {
  return (
    <View className="bg-surface-800 rounded-xl p-4 flex-row items-center justify-between">
      <View className="flex-1 mr-3">
        <View className="flex-row items-center gap-2">
          <Text className={`font-semibold ${item.isActive ? 'text-white' : 'text-surface-500'}`}>
            {item.name}
          </Text>
          {!item.isActive && <StatusBadge label="Off" variant="neutral" />}
        </View>
        {item.description ? (
          <Text className="text-surface-500 text-xs mt-0.5" numberOfLines={1}>
            {item.description}
          </Text>
        ) : null}
        <Text className="text-surface-400 text-sm mt-1">
          {item.priceRwf.toLocaleString()} RWF · {item.category}
        </Text>
      </View>
      <Pressable
        onPress={onToggle}
        accessibilityRole="switch"
        accessibilityLabel={item.isActive ? 'Deactivate' : 'Activate'}
        accessibilityState={{ checked: item.isActive }}
        className={`w-12 h-7 rounded-full justify-center ${item.isActive ? 'bg-brand-500' : 'bg-surface-700'}`}
      >
        <View
          className={`w-5 h-5 rounded-full bg-white shadow-sm mx-1 ${item.isActive ? 'self-end' : 'self-start'}`}
        />
      </Pressable>
    </View>
  );
}
