import { useState, useMemo } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { RefreshCw, Plus, Package, Utensils, ShoppingCart } from 'lucide-react-native';
import { colors } from '@/lib/theme';
import { useStockLevels } from '@/features/inventory/useStockLevels';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { usePurchaseSuggestions } from '@/features/purchasing/usePurchaseSuggestions';
import { SearchInput } from '@/components/ui/SearchInput';
import { StockIndicator } from '@/components/ui/StockIndicator';
import { SyncStatusBadge } from '@/components/ui/SyncStatusBadge';
import type { StockLevelDto } from '@/api/inventory-api';

type StockFilter = 'all' | 'in_stock' | 'out_of_stock' | 'in_recipes';

export default function StockScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { data: allItems = [], isLoading, refetch } = useStockLevels();
  const { phase, pendingCount, sync } = useSyncStatus();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StockFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  const outOfStockCount = useMemo(() => allItems.filter((i) => parseFloat(i.current_stock) === 0).length, [allItems]);

  // Build set of ingredient IDs used in menu items (from recipe lines cached in query)
  // useMenuItems doesn't directly return recipe lines; we approximate by checking if
  // expected_daily_use > 0 which indicates the ingredient is linked to a recipe
  const inRecipesIds = useMemo(() => {
    return new Set(allItems.filter((i) => i.expected_daily_use != null && parseFloat(i.expected_daily_use) > 0).map((i) => i.ingredient_id));
  }, [allItems]);

  const inRecipesCount = inRecipesIds.size;

  const { data: suggestionsData } = usePurchaseSuggestions();
  const reorderItems = useMemo(() => {
    return (suggestionsData?.suggestions ?? [])
      .filter((s) => s.is_low_stock || (s.days_cover != null && parseFloat(s.days_cover) < 2))
      .slice(0, 5);
  }, [suggestionsData]);

  const items = useMemo(() => {
    let list = query.trim()
      ? allItems.filter((i) => i.ingredient_name.toLowerCase().includes(query.toLowerCase()))
      : allItems;
    if (filter === 'in_stock') list = list.filter((i) => parseFloat(i.current_stock) > 0);
    if (filter === 'out_of_stock') list = list.filter((i) => parseFloat(i.current_stock) === 0);
    if (filter === 'in_recipes') list = list.filter((i) => inRecipesIds.has(i.ingredient_id));
    return list.slice().sort((a, b) => {
      const da = a.days_cover != null ? parseFloat(a.days_cover) : Infinity;
      const db = b.days_cover != null ? parseFloat(b.days_cover) : Infinity;
      return da - db;
    });
  }, [allItems, query, filter, inRecipesIds]);

  async function handleSync() {
    await sync();
    void refetch();
  }

  return (
    <View className="flex-1 bg-surface-50 dark:bg-surface-900" style={{ paddingTop: insets.top }}>
      <View className="px-4 py-3 border-b border-surface-200 dark:border-surface-800 flex-row items-center justify-between">
        <Text className="text-surface-900 dark:text-white text-lg font-bold">{t('stock.title')}</Text>
        <View className="flex-row items-center gap-3">
          {phase !== 'idle' && <SyncStatusBadge phase={phase} pendingCount={pendingCount} />}
          <TouchableOpacity
            onPress={handleSync}
            disabled={phase === 'syncing'}
            accessibilityLabel={t('stock.syncNow')}
            hitSlop={8}
          >
            <RefreshCw
              size={18}
              color={phase === 'syncing' ? colors.info : colors.surface[400]}
              strokeWidth={2}
            />
          </TouchableOpacity>
          <Pressable
            onPress={() => router.push('/(app)/ingredients/create' as never)}
            accessibilityRole="button"
            accessibilityLabel={t('stock.addIngredientLabel')}
            hitSlop={8}
          >
            <Plus size={22} color={colors.brand[500]} strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>

      <View className="px-4 pt-3 pb-0 gap-3">
        <SearchInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('stock.searchPlaceholder')}
        />
        <View className="flex-row gap-2 pb-2">
          {([
            ['all', t('stock.filterAll'), allItems.length],
            ['in_stock', t('stock.filterInStock'), allItems.length - outOfStockCount],
            ['out_of_stock', t('stock.filterOutOfStock'), outOfStockCount],
            ['in_recipes', t('stock.filterInRecipes'), inRecipesCount],
          ] as [StockFilter, string, number][]).map(([key, label, count]) => (
            <Pressable
              key={key}
              onPress={() => setFilter(key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: filter === key }}
              className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border ${filter === key ? 'bg-brand-500/10 border-brand-500/40' : 'bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-700'}`}
            >
              <Text className={`text-xs font-semibold ${filter === key ? 'text-brand-600 dark:text-brand-300' : 'text-surface-600 dark:text-surface-400'}`}>{label}</Text>
              <View className={`min-w-[18px] h-[18px] rounded-full items-center justify-center px-1 ${filter === key ? 'bg-brand-500/20' : 'bg-surface-200 dark:bg-surface-700'}`}>
                <Text className={`text-[10px] font-bold ${filter === key ? 'text-brand-600 dark:text-brand-300' : 'text-surface-500'}`}>{count}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Smart Reorder strip — appears only when low-stock items need ordering */}
      {reorderItems.length > 0 && (
        <Pressable
          onPress={() => router.push('/(app)/(tabs)/purchasing' as never)}
          accessibilityRole="button"
          accessibilityLabel={t('stock.reorderTapHint', { count: reorderItems.length })}
          className="mx-4 mb-2 rounded-xl overflow-hidden active:opacity-80"
        >
          <View className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl px-4 py-3 gap-2">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <ShoppingCart size={14} color={colors.warning} strokeWidth={2} />
                <Text className="text-amber-700 dark:text-amber-400 font-semibold text-sm">
                  {t('stock.reorderNeed', { count: reorderItems.length })}
                </Text>
              </View>
              <Text className="text-amber-600 dark:text-amber-500 text-xs font-medium">{t('stock.orderNow')}</Text>
            </View>
            <View className="gap-1">
              {reorderItems.map((s) => (
                <Text key={s.ingredient_id} className="text-amber-800 dark:text-amber-300 text-xs" numberOfLines={1}>
                  {t('stock.reorderSuggest', { name: s.ingredient_name, qty: parseFloat(s.suggested_qty) % 1 === 0 ? Math.round(parseFloat(s.suggested_qty)) : parseFloat(s.suggested_qty).toFixed(1), unit: s.unit })}
                </Text>
              ))}
            </View>
          </View>
        </Pressable>
      )}

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.brand[500]} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.ingredient_id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 88, gap: 8 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />}
          renderItem={({ item }) => <StockRow item={item} />}
          ListEmptyComponent={
            query || filter !== 'all' ? (
              <View className="items-center py-10 px-6 gap-2">
                <Text className="text-surface-900 dark:text-white font-semibold text-base">
                  {filter === 'out_of_stock' ? t('stock.emptyOutOfStockTitle') : filter === 'in_stock' ? t('stock.emptyInStockTitle') : filter === 'in_recipes' ? t('stock.emptyInRecipesTitle') : t('stock.emptySearchTitle')}
                </Text>
                <Text className="text-surface-500 text-sm text-center">
                  {filter === 'out_of_stock' ? t('stock.emptyOutOfStockDesc') : filter === 'in_stock' ? t('stock.emptyInStockDesc') : filter === 'in_recipes' ? t('stock.emptyInRecipesDesc') : t('stock.emptySearchDesc')}
                </Text>
              </View>
            ) : (
              <View className="items-center py-10 px-6 gap-4">
                <View className="w-16 h-16 rounded-full bg-brand-500/10 items-center justify-center">
                  <Package size={28} color={colors.brand[500]} strokeWidth={1.75} />
                </View>
                <View className="items-center gap-1">
                  <Text className="text-surface-900 dark:text-white font-semibold text-base">{t('stock.emptyTitle')}</Text>
                  <Text className="text-surface-500 text-sm text-center">{t('stock.emptyDesc')}</Text>
                </View>
                <Pressable
                  onPress={() => router.push('/(app)/ingredients/create' as never)}
                  accessibilityRole="button"
                  accessibilityLabel={t('stock.addFirstIngredientLabel')}
                  className="bg-brand-500 rounded-xl px-6 py-3 flex-row items-center gap-2 active:opacity-80"
                >
                  <Plus size={16} color={colors.white} strokeWidth={2.5} />
                  <Text className="text-white font-semibold text-sm">{t('stock.addIngredient')}</Text>
                </Pressable>
                <Text className="text-surface-400 text-xs text-center">{t('stock.aiHint')}</Text>
              </View>
            )
          }
        />
      )}
    </View>
  );
}

function StockRow({ item }: { item: StockLevelDto }) {
  const { t } = useTranslation();
  const days = item.days_cover != null ? parseFloat(item.days_cover) : Infinity;
  const dailyUse = item.expected_daily_use != null ? parseFloat(item.expected_daily_use) : null;
  const stock = parseFloat(item.current_stock);
  const isOut = stock === 0;
  const isLow = !isOut && item.is_low_stock;
  const isInRecipe = dailyUse != null && dailyUse > 0;
  const coverLabel = isFinite(days) ? t('stock.daysCoverLabel', { days: days.toFixed(1) }) : t('stock.unlimitedCover');
  const stockDisplay = stock % 1 === 0 ? Math.round(stock) : parseFloat(stock.toFixed(2).replace(/\.?0+$/, ''));
  return (
    <Pressable
      onPress={() => router.push(`/(app)/ingredients/${item.ingredient_id}` as never)}
      accessibilityRole="button"
      accessibilityLabel={t('stock.accessibilityRow', { name: item.ingredient_name, stock: stockDisplay, unit: item.unit, cover: coverLabel })}
      className={`rounded-xl p-4 flex-row items-center justify-between active:opacity-70 ${isOut ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50' : isLow ? 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40' : 'bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent'}`}
    >
      <View className="flex-1 mr-3">
        <View className="flex-row items-center gap-2 flex-wrap">
          <Text className="text-surface-900 dark:text-white font-medium">{item.ingredient_name}</Text>
          {isOut && (
            <View className="bg-red-100 dark:bg-red-900/40 rounded px-1.5 py-0.5">
              <Text className="text-red-600 dark:text-red-400 text-[10px] font-bold uppercase tracking-wide">{t('stock.outOfStock')}</Text>
            </View>
          )}
          {isLow && !isOut && (
            <View className="bg-amber-100 dark:bg-amber-900/40 rounded px-1.5 py-0.5">
              <Text className="text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wide">{t('stock.lowStock')}</Text>
            </View>
          )}
          {isInRecipe && (
            <View className="bg-brand-500/10 rounded px-1.5 py-0.5 flex-row items-center gap-0.5">
              <Utensils size={8} color={colors.brand[500]} strokeWidth={2.5} />
              <Text className="text-brand-600 dark:text-brand-300 text-[10px] font-bold uppercase tracking-wide">{t('stock.inRecipe')}</Text>
            </View>
          )}
        </View>
        <Text className={`text-sm mt-0.5 ${isOut ? 'text-red-500 dark:text-red-400' : isLow ? 'text-amber-600 dark:text-amber-400' : 'text-surface-600 dark:text-surface-400'}`}>
          {isOut
            ? t('stock.noStockReorder')
            : t('stock.onHand', { qty: stockDisplay, unit: item.unit })}
          {!isOut && dailyUse != null && dailyUse > 0 ? ` · ${t('stock.dailyUseRate', { qty: dailyUse % 1 === 0 ? Math.round(dailyUse) : dailyUse.toFixed(1), unit: item.unit })}` : ''}
        </Text>
      </View>
      <StockIndicator daysOfCover={days} />
    </Pressable>
  );
}
