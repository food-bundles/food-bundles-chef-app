import { useState, useMemo } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Plus, ClipboardList, Pencil, Trash2, ChevronRight } from 'lucide-react-native';
import { useMenuItems, useToggleMenuItemActive, useDeleteMenuItem } from '@/features/menu/useMenuItems';
import { SearchInput } from '@/components/ui/SearchInput';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/feedback/EmptyState';
import type { MenuItemDto } from '@/api/menus-api';

const CATEGORIES = ['All', 'Main', 'Side', 'Drink', 'Dessert'];

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const { data: allItems = [], isLoading, refetch } = useMenuItems();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };
  const toggleActiveMutation = useToggleMenuItemActive();
  const deleteMutation = useDeleteMenuItem();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  const items = useMemo(() => {
    return allItems
      .filter((i) => category === 'All' || i.name.toLowerCase().includes(category.toLowerCase()))
      .filter((i) =>
        query.trim()
          ? i.name.toLowerCase().includes(query.toLowerCase())
          : true,
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allItems, query, category]);

  return (
    <View className="flex-1 bg-surface-50 dark:bg-surface-900" style={{ paddingTop: insets.top }}>
      <View className="px-4 py-3 flex-row items-center justify-between border-b border-surface-200 dark:border-surface-800">
        <Text className="text-surface-900 dark:text-white text-lg font-bold">Menu</Text>
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => router.push('/(app)/sales/entry')}
            accessibilityRole="button"
            accessibilityLabel="Record sales"
            className="w-10 h-10 items-center justify-center rounded-xl bg-surface-200 dark:bg-surface-700"
          >
            <ClipboardList size={18} color="#B3B0A6" strokeWidth={1.75} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/(app)/menu/create-item' as never)}
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
              className={`px-3 py-1.5 rounded-full ${category === cat ? 'bg-brand-500' : 'bg-surface-200 dark:bg-surface-800'}`}
            >
              <Text className={`text-xs font-medium ${category === cat ? 'text-white' : 'text-surface-600 dark:text-surface-400'}`}>
                {cat}
              </Text>
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
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 8 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0E8438" colors={['#0E8438']} />}
          renderItem={({ item }) => (
            <MenuItemRow
              item={item}
              onToggle={() =>
                toggleActiveMutation.mutate({
                  menuId: item.menu_id,
                  itemId: item.id,
                  isActive: item.is_active,
                })
              }
              onEdit={() =>
                router.push({
                  pathname: '/(app)/menu/edit-item',
                  params: {
                    itemId: item.id,
                    menuId: item.menu_id,
                    name: item.name,
                    selling_price: item.selling_price,
                    description: item.description ?? '',
                  },
                } as never)
              }
              onDelete={() => {
                Alert.alert(
                  'Delete Item',
                  `Remove "${item.name}" from the menu?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => deleteMutation.mutate({ menuId: item.menu_id, itemId: item.id }),
                    },
                  ]
                );
              }}
            />
          )}
          ListEmptyComponent={
            query ? (
              <EmptyState title="No results" description="Try a different search term." />
            ) : (
              <View className="px-4 py-10 items-center gap-4">
                <Text className="text-5xl">🍽️</Text>
                <Text className="text-surface-900 dark:text-white font-bold text-lg">Your menu is empty</Text>
                <Text className="text-surface-600 dark:text-surface-400 text-sm text-center">
                  Add your dishes and drinks so you can record sales and track which ingredients you need.
                </Text>
                <Pressable
                  onPress={() => router.push('/(app)/menu/create-item' as never)}
                  accessibilityRole="button"
                  accessibilityLabel="Add your first menu item"
                  className="bg-brand-700 rounded-full px-8 py-3 active:opacity-80"
                >
                  <Text className="text-white font-semibold">Add First Item</Text>
                </Pressable>
                <View className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl p-4 w-full gap-2 mt-2">
                  <Text className="text-surface-700 dark:text-surface-300 text-xs font-medium uppercase tracking-wider">Why add menu items?</Text>
                  <Text className="text-surface-600 dark:text-surface-400 text-sm">• Record daily sales per dish</Text>
                  <Text className="text-surface-600 dark:text-surface-400 text-sm">• Auto-calculate ingredient usage</Text>
                  <Text className="text-surface-600 dark:text-surface-400 text-sm">• Get purchase suggestions when stock is low</Text>
                </View>
              </View>
            )
          }
        />
      )}
    </View>
  );
}

function MenuItemRow({
  item,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: MenuItemDto;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const priceRwf = parseFloat(item.selling_price);
  return (
    <Pressable
      onPress={() => router.push(`/(app)/menu/${item.id}` as never)}
      accessibilityRole="button"
      accessibilityLabel={`View ${item.name} details`}
      className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl p-4 gap-3 active:opacity-80"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-3">
          <View className="flex-row items-center gap-2 flex-wrap">
            <Text className={`font-semibold ${item.is_active ? 'text-surface-900 dark:text-white' : 'text-surface-500'}`}>
              {item.name}
            </Text>
            {!item.is_active && <StatusBadge label="Off" variant="neutral" />}
          </View>
          {item.description ? (
            <Text className="text-surface-500 text-xs mt-0.5" numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
          <Text className="text-brand-500 text-sm font-semibold mt-1">
            {isNaN(priceRwf) ? item.selling_price : priceRwf.toLocaleString()} RWF
          </Text>
        </View>
        {/* Active toggle */}
        <Pressable
          onPress={onToggle}
          accessibilityRole="switch"
          accessibilityLabel={item.is_active ? 'Deactivate' : 'Activate'}
          accessibilityState={{ checked: item.is_active }}
          className={`w-12 h-7 rounded-full justify-center ${item.is_active ? 'bg-brand-500' : 'bg-surface-300 dark:bg-surface-700'}`}
        >
          <View
            className={`w-5 h-5 rounded-full bg-white shadow-sm mx-1 ${item.is_active ? 'self-end' : 'self-start'}`}
          />
        </Pressable>
      </View>

      {/* Edit / Delete row */}
      <View className="flex-row gap-2 border-t border-surface-100 dark:border-surface-700 pt-2">
        <Pressable
          onPress={onEdit}
          accessibilityRole="button"
          accessibilityLabel="Edit item"
          className="flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 active:opacity-70"
        >
          <Pencil size={14} color="#6B7280" strokeWidth={2} />
          <Text className="text-surface-600 dark:text-surface-300 text-xs font-medium">Edit</Text>
        </Pressable>
        <Pressable
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel="Delete item"
          className="flex-row items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-red-50 dark:bg-red-900/20 active:opacity-70"
        >
          <Trash2 size={14} color="#EF4444" strokeWidth={2} />
          <Text className="text-red-500 text-xs font-medium">Delete</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push(`/(app)/menu/${item.id}` as never)}
          accessibilityRole="button"
          accessibilityLabel="View details"
          className="flex-row items-center justify-center gap-1 py-2 px-3 rounded-lg bg-brand-500/10 active:opacity-70"
        >
          <ChevronRight size={14} color="#0E8438" strokeWidth={2} />
          <Text className="text-brand-400 text-xs font-medium">Details</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}
