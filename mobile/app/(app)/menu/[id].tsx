import { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, Switch } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Utensils, Plus, Trash2, AlertTriangle, TrendingDown } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { AppPressable } from '@/components/ui/AppPressable';
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
import { useIngredients } from '@/features/ingredients/useIngredients';
import { AddToRecipeSheet } from '@/features/menu/AddToRecipeSheet';
import { formatDate, formatQuantity } from '@/lib/format';
import { formatMoney, formatUnitCost } from '@/lib/money';
import { formatRate } from '@/features/kitchens/currency-change';
import { useTheme } from '@/providers/ThemeProvider';
import { useKitchenStore } from '@/store/kitchen-store';
import { spacing, fontSize, fontWeight, radius } from '@/lib/theme';
import type { RecipeLineDto } from '@/api/menus-api';

/** Gross margin the food-cost coach aims for. */
const TARGET_MARGIN = 0.4;

export default function MenuItemDetailScreen() {
  const { t, i18n } = useTranslation();
  const conversionEnabled = useKitchenStore((s) => s.activeKitchen?.conversionEnabled ?? false);
  const tk = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: allItems = [], isLoading: loadingItem } = useMenuItems();
  const item = allItems.find((i) => i.id === id);

  const { data: lines = [], isLoading: loadingLines } = useRecipeLines(id ?? '');
  const { data: cost } = useRecipeCost(id ?? '');
  const { data: stockLevels = [] } = useStockLevels();
  const { data: ingredients = [] } = useIngredients();
  const toggleActive = useToggleMenuItemActive();
  const addLine = useAddRecipeLine(id ?? '');
  const deleteLine = useDeleteRecipeLine(id ?? '');

  const [sheetOpen, setSheetOpen] = useState(false);
  const [snack, setSnack] = useState<{ message: string; action?: () => void } | null>(null);

  const card = { backgroundColor: tk.surfaceRaised, borderRadius: radius.lg, borderWidth: 1, borderColor: tk.border };

  function handleDeleteLine(line: RecipeLineDto, name: string) {
    Alert.alert(t('menuItem.removeLineTitle'), t('menuItem.removeLineMessage', { name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('menuItem.removeLineConfirm'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteLine.mutateAsync(line.id);
            setSnack({
              message: t('menuItem.lineRemoved', { name }),
              action: () => {
                void addLine.mutateAsync({
                  ingredient_id: line.ingredient_id,
                  qty_per_portion: line.qty_per_portion,
                  unit: line.unit,
                });
              },
            });
          } catch {
            setSnack({ message: t('menuItem.removeLineError') });
          }
        },
      },
    ]);
  }

  if (loadingItem || !item) {
    return (
      <AppScreen>
        <AppHeader title={t('menuItem.title')} showBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: tk.surface }}>
          {loadingItem ? (
            <ActivityIndicator color={tk.primary} />
          ) : (
            <Text style={{ color: tk.textMuted, textAlign: 'center' }}>{t('menuItem.notFound')}</Text>
          )}
        </View>
      </AppScreen>
    );
  }

  const price = parseFloat(item.selling_price);
  // Food cost is in the kitchen's currency (converted server-side where needed).
  const costCurrency = cost?.currency ?? item.selling_price_currency ?? '';
  const hasCost = Boolean(cost?.lines.some((l) => l.line_cost != null));
  // A partial total (a cost in another currency had no rate) would overstate the margin and
  // mislead the food-cost coach, so it is not shown; the "incomplete" notice explains why.
  const totalCost = hasCost && cost && cost.complete !== false ? parseFloat(cost.total_cost) : null;
  const margin = totalCost != null && price > 0 ? ((price - totalCost) / price) * 100 : null;
  const topCostLine = cost?.lines
    .filter((l) => l.line_cost != null)
    .sort((a, b) => parseFloat(b.line_cost ?? '0') - parseFloat(a.line_cost ?? '0'))[0];
  const targetPrice = totalCost != null && totalCost > 0 ? Math.ceil(totalCost / (1 - TARGET_MARGIN)) : null;

  const ingredientName = (ingredientId: string) =>
    cost?.lines.find((l) => l.ingredient_id === ingredientId)?.ingredient_name ??
    ingredients.find((i) => i.id === ingredientId)?.name ??
    t('menuItem.unknownIngredient');

  const marginColor = margin == null ? tk.text : margin >= 60 ? tk.link : margin >= 40 ? tk.warningText : tk.danger;

  return (
    <AppScreen edges={['top']}>
      <AppHeader
        title={item.name}
        showBack
        right={
          <AppPressable
            onPress={() =>
              router.push({
                pathname: '/(app)/menu/edit-item',
                params: {
                  itemId: item.id,
                  menuId: item.menu_id,
                  name: item.name,
                  selling_price: item.selling_price,
                  description: item.description ?? '',
                  category: item.category ?? '',
                },
              } as never)
            }
            accessibilityRole="button"
            accessibilityLabel={t('menuItem.editItemLabel', { name: item.name })}
            hitSlop={8}
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <Text style={{ color: tk.link, fontSize: fontSize.sm, fontWeight: '600' }}>{t('menuItem.editItem')}</Text>
          </AppPressable>
        }
      />

      <ScrollView
        style={{ flex: 1, backgroundColor: tk.surface }}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary card */}
        <View style={[card, { padding: spacing.md, gap: spacing.sm }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: tk.text, fontSize: fontSize['2xl'], fontWeight: '800' }}>
              {formatMoney(price, item.selling_price_currency ?? costCurrency, i18n.language)}
            </Text>
            <StatusBadge
              label={item.is_active ? t('menuItem.active') : t('menuItem.inactive')}
              variant={item.is_active ? 'success' : 'neutral'}
            />
          </View>
          {item.description ? <Text style={{ color: tk.textMuted, fontSize: fontSize.sm }}>{item.description}</Text> : null}
          {totalCost != null && (
            <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: 4 }}>
              <View>
                <Text style={{ color: tk.textMuted, fontSize: fontSize.xs }}>{t('menuItem.foodCost')}</Text>
                <Text style={{ color: tk.text, fontSize: fontSize.sm, fontWeight: '600' }}>{formatMoney(totalCost, costCurrency, i18n.language)}</Text>
              </View>
              {margin != null && (
                <View>
                  <Text style={{ color: tk.textMuted, fontSize: fontSize.xs }}>{t('menuItem.margin')}</Text>
                  <Text style={{ color: marginColor, fontSize: fontSize.sm, fontWeight: '600' }}>{margin.toFixed(1)}%</Text>
                </View>
              )}
            </View>
          )}
          {cost?.complete === false ? (
            <Text style={{ color: tk.danger, fontSize: fontSize.xs }} accessibilityRole="alert">
              {t('menuItem.costIncomplete')}
            </Text>
          ) : null}
          <View style={{ borderTopWidth: 1, borderTopColor: tk.border, marginTop: 4, marginHorizontal: -spacing.md }}>
            <ListRow
              icon={<Utensils size={18} color={item.is_active ? tk.link : tk.textMuted} strokeWidth={2} />}
              iconBg={item.is_active ? tk.primaryTint : tk.surfaceSunken}
              title={t('menuItem.availableOnMenu')}
              subtitle={item.is_active ? t('menuItem.visibleToStaff') : t('menuItem.hiddenFromSales')}
              trailing={
                <Switch
                  value={item.is_active}
                  onValueChange={() => toggleActive.mutate({ menuId: item.menu_id, itemId: item.id, isActive: item.is_active })}
                  disabled={toggleActive.isPending}
                  trackColor={{ false: tk.border, true: tk.primary }}
                  thumbColor={tk.onPrimary}
                  accessibilityRole="switch"
                  accessibilityLabel={t('menuItem.availableLabel', { name: item.name })}
                  accessibilityState={{ checked: item.is_active }}
                />
              }
              separator={false}
            />
          </View>
        </View>

        {/* Food-cost coach — deterministic, shown when margin is under target */}
        {margin != null && totalCost != null && margin < TARGET_MARGIN * 100 && (
          <View style={{ backgroundColor: tk.warningTint, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm }} accessibilityRole="alert">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} color={tk.warningText} strokeWidth={2} />
              <Text style={{ color: tk.warningText, fontWeight: '700', fontSize: fontSize.sm, flex: 1 }}>
                {t('menuItem.foodCostHigh', { margin: margin.toFixed(0) })}
              </Text>
            </View>
            <Text style={{ color: tk.text, fontSize: fontSize.xs, lineHeight: 18 }}>
              {targetPrice
                ? t('menuItem.raisePriceTo', { price: formatMoney(targetPrice, costCurrency, i18n.language), margin: TARGET_MARGIN * 100 })
                : t('menuItem.raisePrice')}
              {topCostLine ? ` ${t('menuItem.orReducePortion', { name: topCostLine.ingredient_name })}` : ''}
            </Text>
            {topCostLine?.line_cost ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TrendingDown size={12} color={tk.warningText} strokeWidth={2} />
                <Text style={{ color: tk.text, fontSize: fontSize.xs }}>
                  {t('menuItem.highestCostIngredient', {
                    name: topCostLine.ingredient_name,
                    cost: formatMoney(topCostLine.line_cost, costCurrency, i18n.language),
                  })}
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Recipe ingredients */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: tk.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            {t('menuItem.recipeIngredients')}
          </Text>
          <AppPressable
            onPress={() => setSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('menuItem.addIngredientLabel')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingHorizontal: 4 }}
          >
            <Plus size={14} color={tk.link} strokeWidth={2.5} />
            <Text style={{ color: tk.link, fontSize: fontSize.sm, fontWeight: '600' }}>{t('common.add')}</Text>
          </AppPressable>
        </View>

        {loadingLines ? (
          <ActivityIndicator color={tk.primary} />
        ) : lines.length === 0 ? (
          <View style={[card, { padding: spacing.md, alignItems: 'center', gap: spacing.sm }]}>
            <Utensils size={24} color={tk.textMuted} strokeWidth={1.5} />
            <Text style={{ color: tk.textMuted, fontSize: fontSize.sm, textAlign: 'center' }}>{t('menuItem.noIngredientsYet')}</Text>
            <AppButton label={t('menuItem.addFirstIngredient')} onPress={() => setSheetOpen(true)} />
          </View>
        ) : (
          <View style={{ gap: 6 }}>
            {lines.map((line) => {
              const stock = stockLevels.find((s) => s.ingredient_id === line.ingredient_id);
              const costLine = cost?.lines.find((l) => l.ingredient_id === line.ingredient_id);
              const isOut = stock ? parseFloat(stock.current_stock) <= 0 : false;
              const name = ingredientName(line.ingredient_id);
              return (
                <View
                  key={line.id}
                  style={{
                    backgroundColor: isOut ? tk.dangerTint : tk.surfaceRaised,
                    borderRadius: radius.md,
                    padding: spacing.sm + 2,
                    borderWidth: 1,
                    borderColor: isOut ? tk.danger : tk.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ color: tk.text, fontSize: fontSize.sm, fontWeight: '600', flexShrink: 1 }}>{name}</Text>
                      {isOut && <StatusBadge label={t('menuItem.outOfStock')} variant="danger" />}
                    </View>
                    <Text style={{ color: tk.textMuted, fontSize: fontSize.xs, marginTop: 2 }}>
                      {t('menuItem.perPortion', { qty: formatQuantity(line.qty_per_portion, i18n.language), unit: line.unit })}
                      {costLine?.line_cost ? ` · ${formatMoney(costLine.line_cost, costCurrency, i18n.language)}` : ''}
                    </Text>
                    {costLine?.rate_unavailable && costLine.cost_per_unit_currency ? (
                      <Text style={{ color: tk.danger, fontSize: fontSize.xs, marginTop: 2 }}>
                        {conversionEnabled
                          ? t('menuItem.lineRateUnavailable', { currency: costLine.cost_per_unit_currency })
                          : t('menuItem.lineConversionOff', { currency: costLine.cost_per_unit_currency })}
                      </Text>
                    ) : costLine?.rate && costLine.cost_per_unit && costLine.cost_per_unit_currency ? (
                      <Text style={{ color: tk.textMuted, fontSize: fontSize.xs, marginTop: 2 }}>
                        {t('menuItem.lineConverted', {
                          original: formatUnitCost(costLine.cost_per_unit, costLine.cost_per_unit_currency, i18n.language),
                          rate: formatRate(costLine.rate, i18n.language),
                          date: formatDate(costLine.rate.rate_date, i18n.language),
                        })}
                      </Text>
                    ) : null}
                  </View>
                  <AppPressable
                    onPress={() => handleDeleteLine(line, name)}
                    accessibilityRole="button"
                    accessibilityLabel={t('menuItem.removeLineLabel', { name })}
                    hitSlop={8}
                    style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Trash2 size={16} color={tk.textMuted} strokeWidth={1.75} />
                  </AppPressable>
                </View>
              );
            })}
          </View>
        )}

      </ScrollView>

      <AddToRecipeSheet
        visible={sheetOpen}
        menuItemId={item.id}
        existingIngredientIds={lines.map((l) => l.ingredient_id)}
        onClose={() => setSheetOpen(false)}
        onAdded={(name) => {
          setSheetOpen(false);
          setSnack({ message: t('menuItem.lineAdded', { name }) });
        }}
      />

      <Snackbar
        visible={snack !== null}
        message={snack?.message ?? ''}
        actionLabel={snack?.action ? t('common.undo') : undefined}
        onAction={snack?.action}
        onDismiss={() => setSnack(null)}
      />
    </AppScreen>
  );
}
