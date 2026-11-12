import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Utensils, Plus, Trash2, TrendingUp, ChevronRight, X } from 'lucide-react-native';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
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

  const [showAddModal, setShowAddModal] = useState(false);
  const [ingredients, setIngredients] = useState<IngredientDto[]>([]);
  const [loadingIngredients, setLoadingIngredients] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<IngredientDto | null>(null);
  const [qtyPerPortion, setQtyPerPortion] = useState('');
  const [addingLine, setAddingLine] = useState(false);

  const bg = isDark ? colors.surface[950] : colors.surface[50];
  const cardBg = isDark ? colors.surface[800] : colors.white;
  const textPrimary = isDark ? colors.white : colors.surface[900];
  const textSecondary = isDark ? colors.surface[400] : colors.surface[600];
  const borderColor = isDark ? 'transparent' : colors.surface[200];

  async function openAddModal() {
    setShowAddModal(true);
    if (ingredients.length === 0 && activeKitchen) {
      setLoadingIngredients(true);
      try {
        const list = await listIngredients(activeKitchen.id);
        setIngredients(list.filter((i) => i.is_active));
      } catch {
        Alert.alert('Error', 'Could not load ingredients.');
      } finally {
        setLoadingIngredients(false);
      }
    }
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
      setShowAddModal(false);
      setSelectedIngredient(null);
      setQtyPerPortion('');
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
          <ActivityIndicator color="#0E8438" />
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
            <Text style={{ color: '#0E8438', fontSize: fontSize.sm, fontWeight: '600' }}>Edit</Text>
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
                  <Text style={{ color: margin >= 60 ? '#0E8438' : margin >= 40 ? '#F59E0B' : '#EF4444', fontSize: fontSize.sm, fontWeight: '600' }}>
                    {margin.toFixed(1)}%
                  </Text>
                </View>
              )}
            </View>
          )}
          <Pressable
            onPress={() => toggleActive.mutate({ menuId: item.menu_id, itemId: item.id, isActive: item.is_active })}
            disabled={toggleActive.isPending}
            accessibilityRole="switch"
            accessibilityLabel={item.is_active ? 'Deactivate item' : 'Activate item'}
            style={({ pressed }) => ({
              marginTop: 4,
              backgroundColor: item.is_active ? (isDark ? colors.surface[700] : colors.surface[100]) : '#0E8438',
              borderRadius: radius.md,
              paddingVertical: spacing.sm,
              alignItems: 'center',
              opacity: toggleActive.isPending ? 0.5 : pressed ? 0.75 : 1,
            })}
          >
            <Text style={{ color: item.is_active ? textSecondary : '#fff', fontWeight: '600', fontSize: fontSize.sm }}>
              {item.is_active ? 'Deactivate from Menu' : 'Activate on Menu'}
            </Text>
          </Pressable>
        </View>

        {/* Recipe ingredients */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: textSecondary, fontSize: fontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Recipe Ingredients
          </Text>
          <Pressable
            onPress={() => void openAddModal()}
            accessibilityRole="button"
            accessibilityLabel="Add ingredient to recipe"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Plus size={14} color="#0E8438" strokeWidth={2.5} />
            <Text style={{ color: '#0E8438', fontSize: fontSize.sm, fontWeight: '600' }}>Add</Text>
          </Pressable>
        </View>

        {loadingLines ? (
          <ActivityIndicator color="#0E8438" />
        ) : lines.length === 0 ? (
          <View style={{ backgroundColor: cardBg, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor, alignItems: 'center', gap: spacing.sm }}>
            <Utensils size={24} color={colors.surface[500]} strokeWidth={1.5} />
            <Text style={{ color: textSecondary, fontSize: fontSize.sm, textAlign: 'center' }}>
              No ingredients linked yet.{'\n'}Add ingredients to track food cost and stock usage.
            </Text>
            <Pressable
              onPress={() => void openAddModal()}
              accessibilityRole="button"
              style={{ backgroundColor: '#0E8438', borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}
            >
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: fontSize.sm }}>Add First Ingredient</Text>
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
                  style={{ backgroundColor: isOut ? (isDark ? '#2D1515' : '#FEF2F2') : cardBg, borderRadius: radius.md, padding: spacing.sm + 2, borderWidth: 1, borderColor: isOut ? '#FCA5A5' : borderColor, flexDirection: 'row', alignItems: 'center' }}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ color: textPrimary, fontSize: fontSize.sm, fontWeight: '600' }}>
                        {costLine?.ingredient_name ?? line.ingredient_id.slice(0, 8)}
                      </Text>
                      {isOut && (
                        <View style={{ backgroundColor: '#FEE2E2', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
                          <Text style={{ color: '#DC2626', fontSize: 9, fontWeight: '700', textTransform: 'uppercase' }}>Out</Text>
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

        {/* Quick link to record sales */}
        <Pressable
          onPress={() => router.push('/(app)/sales/entry' as never)}
          accessibilityRole="button"
          accessibilityLabel="Record a sale for this item"
          style={({ pressed }) => ({
            backgroundColor: cardBg,
            borderRadius: radius.lg,
            padding: spacing.md,
            borderWidth: 1,
            borderColor,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#0E8438' + '20', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={16} color="#0E8438" strokeWidth={2} />
            </View>
            <View>
              <Text style={{ color: textPrimary, fontSize: fontSize.sm, fontWeight: '600' }}>Record a Sale</Text>
              <Text style={{ color: textSecondary, fontSize: fontSize.xs }}>Log portions sold today</Text>
            </View>
          </View>
          <ChevronRight size={16} color={textSecondary} strokeWidth={2} />
        </Pressable>
      </ScrollView>

      {/* Add ingredient modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={() => setShowAddModal(false)}>
          <Pressable onPress={() => { /* stop propagation */ }}>
            <View style={{ backgroundColor: isDark ? colors.surface[900] : colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg, gap: spacing.md, maxHeight: '80%' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: textPrimary, fontSize: fontSize.base, fontWeight: '700' }}>Add Ingredient</Text>
                <Pressable onPress={() => setShowAddModal(false)} hitSlop={8}>
                  <X size={20} color={textSecondary} />
                </Pressable>
              </View>

              {loadingIngredients ? (
                <ActivityIndicator color="#0E8438" />
              ) : (
                <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
                  <View style={{ gap: 6 }}>
                    {ingredients.filter((ing) => !lines.some((l) => l.ingredient_id === ing.id)).map((ing) => (
                      <Pressable
                        key={ing.id}
                        onPress={() => setSelectedIngredient(ing)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selectedIngredient?.id === ing.id }}
                        style={({ pressed }) => ({
                          backgroundColor: selectedIngredient?.id === ing.id ? '#0E843820' : (isDark ? colors.surface[800] : colors.surface[100]),
                          borderRadius: radius.md,
                          padding: spacing.sm + 2,
                          borderWidth: 1,
                          borderColor: selectedIngredient?.id === ing.id ? '#0E8438' : 'transparent',
                          opacity: pressed ? 0.75 : 1,
                        })}
                      >
                        <Text style={{ color: textPrimary, fontSize: fontSize.sm, fontWeight: '500' }}>{ing.name}</Text>
                        <Text style={{ color: textSecondary, fontSize: fontSize.xs }}>{ing.unit}</Text>
                      </Pressable>
                    ))}
                    {ingredients.filter((ing) => !lines.some((l) => l.ingredient_id === ing.id)).length === 0 && (
                      <Text style={{ color: textSecondary, fontSize: fontSize.sm, textAlign: 'center', padding: spacing.md }}>
                        All active ingredients are already in this recipe.
                      </Text>
                    )}
                  </View>
                </ScrollView>
              )}

              {selectedIngredient && (
                <View style={{ gap: spacing.sm }}>
                  <Text style={{ color: textSecondary, fontSize: fontSize.sm }}>
                    Qty per portion ({selectedIngredient.unit})
                  </Text>
                  <TextInput
                    style={{
                      backgroundColor: isDark ? colors.surface[800] : colors.surface[100],
                      borderRadius: radius.md,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      color: textPrimary,
                      fontSize: fontSize.base,
                    }}
                    value={qtyPerPortion}
                    onChangeText={setQtyPerPortion}
                    placeholder={`Amount in ${selectedIngredient.unit}`}
                    placeholderTextColor={colors.surface[500]}
                    keyboardType="decimal-pad"
                    autoFocus
                  />
                </View>
              )}

              <Pressable
                onPress={() => void handleAddLine()}
                disabled={!selectedIngredient || !qtyPerPortion || addingLine}
                accessibilityRole="button"
                style={({ pressed }) => ({
                  backgroundColor: '#0E8438',
                  borderRadius: radius.lg,
                  paddingVertical: spacing.md,
                  alignItems: 'center',
                  opacity: (!selectedIngredient || !qtyPerPortion || addingLine) ? 0.45 : pressed ? 0.75 : 1,
                })}
              >
                {addingLine ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: fontSize.base }}>
                    Add to Recipe
                  </Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </AppScreen>
  );
}
