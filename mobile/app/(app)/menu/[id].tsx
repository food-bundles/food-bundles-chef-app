import { useState, useRef, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, Switch, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Utensils, Plus, Trash2, TrendingUp, X, AlertTriangle, TrendingDown, AlertCircle, RefreshCw } from 'lucide-react-native';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import { AppButton } from '@/components/ui/AppButton';
import { ListRow } from '@/components/ui/ListRow';
import { Snackbar } from '@/components/ui/Snackbar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  useMenuItems,
  useToggleMenuItemActive,
  useRecipeLines,
  useRecipeCost,
  useAddRecipeLine,
  useDeleteRecipeLine,
} from '@/features/menu/useMenuItems';
import { useStockLevels } from '@/features/inventory/useStockLevels';
import { listIngredients } from '@/api/ingredients-api';
import { useKitchenStore } from '@/store/kitchen-store';
import { colors, spacing, fontSize, radius } from '@/lib/theme';
import type { RecipeLineDto } from '@/api/menus-api';
import type { IngredientDto } from '@/api/ingredients-api';

export default function MenuItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isDark = useColorScheme() === 'dark';
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);

  const { data: allItems = [], isLoading: loadingItem } = useMenuItems();
  const item = allItems.find((i) => i.id === id);

  const { data: lines = [], isLoading: loadingLines } = useRecipeLines(id ?? '');
  const { data: cost } = useRecipeCost(id ?? '');
  const { data: stockLevels = [] } = useStockLevels();
  const toggleActive = useToggleMenuItemActive();
  const addLine = useAddRecipeLine(id ?? '');
  const deleteLine = useDeleteRecipeLine(id ?? '');

  const insets = useSafeAreaInsets();

  const bottomSheetRef = useRef<BottomSheet>(null);
  const [ingredients, setIngredients] = useState<IngredientDto[]>([]);
  const [loadingIngredients, setLoadingIngredients] = useState(false);
  const [ingredientLoadError, setIngredientLoadError] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<IngredientDto | null>(null);
  const [qtyPerPortion, setQtyPerPortion] = useState('');
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [addingLine, setAddingLine] = useState(false);
  const [snack, setSnack] = useState<{ message: string; action?: () => void } | null>(null);

  const bg = isDark ? colors.surface[950] : colors.surface[50];
  const cardBg = isDark ? colors.surface[800] : colors.white;
  const textPrimary = isDark ? colors.white : colors.surface[900];
  const textSecondary = isDark ? colors.surface[400] : colors.surface[600];
  const borderColor = isDark ? 'transparent' : colors.surface[200];

  const closeAddSheet = useCallback(() => {
    bottomSheetRef.current?.close();
    setSelectedIngredient(null);
    setQtyPerPortion('');
    setIngredientSearch('');
    setIngredientLoadError(false);
  }, []);

  const loadIngredients = useCallback(async () => {
    if (!activeKitchen) {
      setIngredientLoadError(true);
      return;
    }
    setLoadingIngredients(true);
    setIngredientLoadError(false);
    try {
      const list = await listIngredients(activeKitchen.id);
      setIngredients(list.filter((i) => i.is_active));
    } catch {
      setIngredientLoadError(true);
    } finally {
      setLoadingIngredients(false);
    }
  }, [activeKitchen]);

  async function openAddSheet() {
    setSelectedIngredient(null);
    setQtyPerPortion('');
    setIngredientSearch('');
    setIngredientLoadError(false);
    bottomSheetRef.current?.snapToIndex(0);
    await loadIngredients();
  }

  async function handleAddLine() {
    if (!selectedIngredient || !qtyPerPortion) return;
    const qty = parseFloat(qtyPerPortion);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Invalid quantity', 'Enter a positive number.');
      return;
    }
    setAddingLine(true);
    try {
      await addLine.mutateAsync({
        ingredient_id: selectedIngredient.id,
        qty_per_portion: String(qty),
        unit: selectedIngredient.unit,
      });
      closeAddSheet();
      setSnack({ message: `${selectedIngredient.name} added to recipe` });
    } catch {
      Alert.alert('Error', 'Could not add ingredient. Please try again.');
    } finally {
      setAddingLine(false);
    }
  }

  async function handleDeleteLine(line: RecipeLineDto) {
    Alert.alert(
      'Remove ingredient?',
      'This will remove it from the recipe.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteLine.mutateAsync(line.id);
              setSnack({
                message: 'Ingredient removed',
                action: () => {
                  void addLine.mutateAsync({
                    ingredient_id: line.ingredient_id,
                    qty_per_portion: line.qty_per_portion,
                    unit: line.unit,
                  });
                },
              });
            } catch {
              Alert.alert('Error', 'Could not remove ingredient.');
            }
          },
        },
      ]
    );
  }

  if (loadingItem) {
    return (
      <AppScreen>
        <AppHeader title="Menu Item" showBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.brand[500]} />
        </View>
      </AppScreen>
    );
  }

  if (!item) {
    return (
      <AppScreen>
        <AppHeader title="Menu Item" showBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
          <Text style={{ color: textSecondary, textAlign: 'center' }}>Item not found.</Text>
        </View>
      </AppScreen>
    );
  }

  const price = parseFloat(item.selling_price);
  const totalCost = cost?.total_cost_per_portion ? parseFloat(cost.total_cost_per_portion) : null;
  const margin = totalCost != null ? ((price - totalCost) / price) * 100 : null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <AppScreen edges={['top']}>
      <AppHeader
        title={item.name}
        showBack
        right={
          <Pressable
            onPress={() => router.push(`/(app)/menu/edit-item?id=${item.id}&menuId=${item.menu_id}` as never)}
            accessibilityRole="button"
            accessibilityLabel="Edit menu item"
            hitSlop={8}
          >
            <Text style={{ color: colors.brand[500], fontSize: fontSize.sm, fontWeight: '600' }}>Edit</Text>
          </Pressable>
        }
      />

      <ScrollView
        style={{ flex: 1, backgroundColor: bg }}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary card */}
        <View style={{ backgroundColor: cardBg, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor, gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: textPrimary, fontSize: fontSize['2xl'], fontWeight: '800' }}>
              {price.toLocaleString()} RWF
            </Text>
            <StatusBadge label={item.is_active ? 'Active' : 'Inactive'} variant={item.is_active ? 'success' : 'neutral'} />
          </View>
          {item.description ? (
            <Text style={{ color: textSecondary, fontSize: fontSize.sm }}>{item.description}</Text>
          ) : null}
          {totalCost != null && (
            <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: 4 }}>
              <View>
                <Text style={{ color: textSecondary, fontSize: fontSize.xs }}>Food cost</Text>
                <Text style={{ color: textPrimary, fontSize: fontSize.sm, fontWeight: '600' }}>
                  {totalCost.toLocaleString()} RWF
                </Text>
              </View>
              {margin != null && (
                <View>
                  <Text style={{ color: textSecondary, fontSize: fontSize.xs }}>Margin</Text>
                  <Text style={{ color: margin >= 60 ? colors.brand[500] : margin >= 40 ? colors.warning : colors.danger, fontSize: fontSize.sm, fontWeight: '600' }}>
                    {margin.toFixed(1)}%
                  </Text>
                </View>
              )}
            </View>
          )}
          {/* Available on menu — Switch row (#5, #6) */}
          <View style={{ backgroundColor: cardBg, borderRadius: radius.lg, borderWidth: 1, borderColor, overflow: 'hidden', marginTop: 4 }}>
            <ListRow
              icon={<Utensils size={18} color={item.is_active ? colors.brand[500] : colors.surface[500]} strokeWidth={2} />}
              iconBg={item.is_active ? colors.brand[50] : (isDark ? colors.surface[700] : colors.surface[100])}
              title="Available on menu"
              subtitle={item.is_active ? 'Visible to staff and in sales' : 'Hidden from sales entry'}
              trailing={
                <Switch
                  value={item.is_active}
                  onValueChange={() => toggleActive.mutate({ menuId: item.menu_id, itemId: item.id, isActive: item.is_active })}
                  disabled={toggleActive.isPending}
                  trackColor={{ false: isDark ? colors.surface[600] : colors.surface[300], true: colors.brand[500] }}
                  thumbColor={colors.white}
                  accessibilityRole="switch"
                  accessibilityLabel={`${item.name} available on menu`}
                  accessibilityState={{ checked: item.is_active }}
                />
              }
              separator={false}
            />
          </View>
        </View>

        {/* AI food-cost coach — shows when margin < 40% and cost data is available */}
        {margin != null && totalCost != null && margin < 40 && (() => {
          const topCostLine = cost?.lines
            .filter((l) => l.cost_contribution != null)
            .sort((a, b) => parseFloat(b.cost_contribution!) - parseFloat(a.cost_contribution!))[0];
          // cost / 0.60 → price that gives exactly 40% gross margin (D4: not break-even)
          const targetPriceFor40PctMargin = totalCost > 0 ? Math.ceil(totalCost / 0.60) : null;
          return (
            <View style={{
              backgroundColor: isDark ? colors.warning + '1A' : colors.warning + '1A',
              borderRadius: radius.lg,
              padding: spacing.md,
              borderWidth: 1,
              borderColor: isDark ? colors.warning + '4D' : colors.warning + '4D',
              gap: spacing.sm,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={16} color={colors.warning} strokeWidth={2} />
                <Text style={{ color: colors.warning, fontWeight: '700', fontSize: fontSize.sm, flex: 1 }}>
                  Food cost is high — {margin.toFixed(0)}% margin
                </Text>
              </View>
              <Text style={{ color: isDark ? colors.warning : colors.surface[700], fontSize: fontSize.xs, lineHeight: 18 }}>
                {targetPriceFor40PctMargin
                  ? `To reach a 40% gross margin, raise price to ${targetPriceFor40PctMargin.toLocaleString()} RWF`
                  : 'Consider raising the selling price to improve your gross margin.'}
                {topCostLine ? `, or reduce the ${topCostLine.ingredient_name} portion.` : '.'}
              </Text>
              {topCostLine && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TrendingDown size={12} color={colors.warning} strokeWidth={2} />
                  <Text style={{ color: isDark ? colors.warning : colors.surface[700], fontSize: fontSize.xs }}>
                    Highest cost ingredient: {topCostLine.ingredient_name} · {parseFloat(topCostLine.cost_contribution!).toLocaleString()} RWF/portion
                  </Text>
                </View>
              )}
            </View>
          );
        })()}

        {/* Recipe ingredients */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: textSecondary, fontSize: fontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Recipe Ingredients
          </Text>
          <Pressable
            onPress={() => void openAddSheet()}
            accessibilityRole="button"
            accessibilityLabel="Add ingredient to recipe"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Plus size={14} color={colors.brand[500]} strokeWidth={2.5} />
            <Text style={{ color: colors.brand[500], fontSize: fontSize.sm, fontWeight: '600' }}>Add</Text>
          </Pressable>
        </View>

        {loadingLines ? (
          <ActivityIndicator color={colors.brand[500]} />
        ) : lines.length === 0 ? (
          <View style={{ backgroundColor: cardBg, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor, alignItems: 'center', gap: spacing.sm }}>
            <Utensils size={24} color={colors.surface[500]} strokeWidth={1.5} />
            <Text style={{ color: textSecondary, fontSize: fontSize.sm, textAlign: 'center' }}>
              No ingredients linked yet.{'\n'}Add ingredients to track food cost and stock usage.
            </Text>
            <Pressable
              onPress={() => void openAddSheet()}
              accessibilityRole="button"
              style={{ backgroundColor: colors.brand[500], borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}
            >
              <Text style={{ color: colors.white, fontWeight: '600', fontSize: fontSize.sm }}>Add First Ingredient</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: 6 }}>
            {lines.map((line) => {
              const stock = stockLevels.find((s) => s.ingredient_id === line.ingredient_id);
              const costLine = cost?.lines.find((l) => l.ingredient_id === line.ingredient_id);
              const isOut = stock ? parseFloat(stock.current_stock) === 0 : false;
              return (
                <View
                  key={line.id}
                  style={{ backgroundColor: isOut ? (isDark ? colors.danger + '1A' : colors.danger + '1A') : cardBg, borderRadius: radius.md, padding: spacing.sm + 2, borderWidth: 1, borderColor: isOut ? colors.danger + '66' : borderColor, flexDirection: 'row', alignItems: 'center' }}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ color: textPrimary, fontSize: fontSize.sm, fontWeight: '600' }}>
                        {costLine?.ingredient_name ?? line.ingredient_id.slice(0, 8)}
                      </Text>
                      {isOut && (
                        <View style={{ backgroundColor: colors.danger + '33', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
                          <Text style={{ color: colors.danger, fontSize: 9, fontWeight: '700', textTransform: 'uppercase' }}>Out</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ color: textSecondary, fontSize: fontSize.xs, marginTop: 2 }}>
                      {line.qty_per_portion} {line.unit} per portion
                      {costLine?.cost_contribution ? ` · ${parseFloat(costLine.cost_contribution).toLocaleString()} RWF` : ''}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => void handleDeleteLine(line)}
                    accessibilityRole="button"
                    accessibilityLabel="Remove ingredient"
                    hitSlop={8}
                    style={{ padding: 4 }}
                  >
                    <Trash2 size={16} color={colors.surface[500]} strokeWidth={1.75} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        {/* Quick link to record sales — uses ListRow (#5) */}
        <View style={{ backgroundColor: cardBg, borderRadius: radius.lg, borderWidth: 1, borderColor, overflow: 'hidden' }}>
          <ListRow
            icon={<TrendingUp size={18} color={colors.brand[500]} strokeWidth={2} />}
            iconBg={colors.brand[50]}
            title="Record a Sale"
            subtitle="Log portions sold today"
            onPress={() => router.push('/(app)/sales/entry' as never)}
            accessibilityLabel="Record a sale for this item"
            separator={false}
          />
        </View>
      </ScrollView>

      {/* Add ingredient sheet — @gorhom/bottom-sheet handles keyboard on both platforms */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={['65%']}
        enablePanDownToClose
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        onClose={closeAddSheet}
        backgroundStyle={{ backgroundColor: isDark ? colors.surface[900] : colors.white }}
        handleIndicatorStyle={{ backgroundColor: isDark ? colors.surface[600] : colors.surface[300] }}
      >
        <BottomSheetView style={{ paddingHorizontal: spacing.lg, paddingBottom: 8 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
            <Text style={{ color: textPrimary, fontSize: fontSize.base, fontWeight: '700' }}>Add Ingredient</Text>
            <Pressable onPress={closeAddSheet} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close add ingredient sheet">
              <X size={20} color={textSecondary} />
            </Pressable>
          </View>

          {/* Error state — blank sheet must be impossible */}
          {ingredientLoadError ? (
            <View style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md }}>
              <AlertCircle size={28} color={colors.danger} strokeWidth={1.75} />
              <Text style={{ color: textPrimary, fontWeight: '600', textAlign: 'center' }}>
                {activeKitchen ? 'Could not load ingredients' : 'No kitchen selected'}
              </Text>
              <Text style={{ color: textSecondary, fontSize: fontSize.sm, textAlign: 'center' }}>
                {activeKitchen
                  ? 'Check your connection and try again.'
                  : 'Select a kitchen from the Profile tab, then try again.'}
              </Text>
              {activeKitchen ? (
                <Pressable
                  onPress={() => void loadIngredients()}
                  accessibilityRole="button"
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}
                >
                  <RefreshCw size={14} color={colors.brand[500]} strokeWidth={2} />
                  <Text style={{ color: colors.brand[500], fontWeight: '600', fontSize: fontSize.sm }}>Try again</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <>
              {/* Search */}
              <BottomSheetTextInput
                value={ingredientSearch}
                onChangeText={setIngredientSearch}
                placeholder="Search ingredients…"
                placeholderTextColor={isDark ? colors.surface[500] : colors.surface[400]}
                style={{
                  backgroundColor: isDark ? colors.surface[800] : colors.surface[100],
                  borderRadius: radius.md,
                  paddingHorizontal: spacing.md,
                  paddingVertical: 10,
                  color: textPrimary,
                  fontSize: fontSize.base,
                  marginBottom: spacing.sm,
                  minHeight: 44,
                }}
                accessibilityLabel="Search ingredients"
              />
            </>
          )}
        </BottomSheetView>

        {/* Scrollable ingredient list — only shown when not in error state */}
        {!ingredientLoadError && (
          <>
            {loadingIngredients ? (
              <BottomSheetView style={{ paddingHorizontal: spacing.lg, gap: 8 }}>
                {[1, 2, 3].map((i) => (
                  <View key={i} style={[modalStyles.skeletonRow, { backgroundColor: isDark ? colors.surface[800] : colors.surface[100] }]} />
                ))}
              </BottomSheetView>
            ) : (() => {
              const filtered = ingredients
                .filter((ing) => !lines.some((l) => l.ingredient_id === ing.id))
                .filter((ing) => ing.name.toLowerCase().includes(ingredientSearch.toLowerCase()));

              if (filtered.length === 0) {
                return (
                  <BottomSheetView style={{ paddingHorizontal: spacing.lg, alignItems: 'center', paddingVertical: spacing.md, gap: spacing.sm }}>
                    <Text style={{ color: textSecondary, fontSize: fontSize.sm, textAlign: 'center' }}>
                      {ingredients.length === 0
                        ? 'No ingredients in stock yet.'
                        : ingredientSearch
                          ? `No match for "${ingredientSearch}".`
                          : 'All ingredients are already in this recipe.'}
                    </Text>
                    <Pressable
                      onPress={() => {
                        const query = ingredientSearch.trim();
                        closeAddSheet();
                        router.push(query
                          ? (`/(app)/ingredients/create?prefill=${encodeURIComponent(query)}` as never)
                          : ('/(app)/ingredients/create' as never)
                        );
                      }}
                      accessibilityRole="button"
                    >
                      <Text style={{ color: colors.brand[500], fontSize: fontSize.sm, fontWeight: '600' }}>
                        {ingredientSearch.trim() ? `+ Create "${ingredientSearch.trim()}"` : '+ Add a new ingredient'}
                      </Text>
                    </Pressable>
                  </BottomSheetView>
                );
              }

              return (
                <BottomSheetScrollView
                  contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 6, paddingBottom: spacing.sm }}
                  keyboardShouldPersistTaps="handled"
                >
                  {filtered.map((ing) => (
                    <Pressable
                      key={ing.id}
                      onPress={() => setSelectedIngredient(ing)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selectedIngredient?.id === ing.id }}
                      style={({ pressed }) => ({
                        backgroundColor: selectedIngredient?.id === ing.id ? colors.brand[100] : (isDark ? colors.surface[800] : colors.surface[100]),
                        borderRadius: radius.md,
                        padding: spacing.sm + 2,
                        borderWidth: 1,
                        borderColor: selectedIngredient?.id === ing.id ? colors.brand[500] : 'transparent',
                        opacity: pressed ? 0.75 : 1,
                      })}
                    >
                      <Text style={{ color: textPrimary, fontSize: fontSize.sm, fontWeight: '500' }}>{ing.name}</Text>
                      <Text style={{ color: textSecondary, fontSize: fontSize.xs }}>{ing.unit}</Text>
                    </Pressable>
                  ))}
                </BottomSheetScrollView>
              );
            })()}

            {/* Quantity input + action — fixed at bottom of sheet */}
            <BottomSheetView style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: Math.max(insets.bottom + 12, 24), gap: spacing.sm }}>
              {selectedIngredient && (
                <BottomSheetTextInput
                  value={qtyPerPortion}
                  onChangeText={setQtyPerPortion}
                  placeholder={`Qty per portion (${selectedIngredient.unit})`}
                  placeholderTextColor={isDark ? colors.surface[500] : colors.surface[400]}
                  keyboardType="decimal-pad"
                  autoFocus
                  style={{
                    backgroundColor: isDark ? colors.surface[800] : colors.surface[100],
                    borderRadius: radius.md,
                    paddingHorizontal: spacing.md,
                    paddingVertical: 10,
                    color: textPrimary,
                    fontSize: fontSize.base,
                    minHeight: 44,
                    borderWidth: 1.5,
                    borderColor: colors.brand[500],
                  }}
                  accessibilityLabel={`Quantity per portion in ${selectedIngredient.unit}`}
                />
              )}
              <AppButton
                label={addingLine ? 'Adding…' : 'Add to Recipe'}
                onPress={() => void handleAddLine()}
                disabled={!selectedIngredient || !qtyPerPortion || addingLine}
                loading={addingLine}
                size="lg"
              />
            </BottomSheetView>
          </>
        )}
      </BottomSheet>

      <Snackbar
        visible={snack !== null}
        message={snack?.message ?? ''}
        actionLabel={snack?.action ? 'Undo' : undefined}
        onAction={snack?.action}
        onDismiss={() => setSnack(null)}
      />
    </AppScreen>
    </GestureHandlerRootView>
  );
}

const modalStyles = StyleSheet.create({
  kav: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skeletonRow: {
    height: 44,
    borderRadius: 10,
  },
});
