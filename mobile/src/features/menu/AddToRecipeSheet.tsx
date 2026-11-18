import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Plus, Package, X, RefreshCw } from 'lucide-react-native';
import { AppPressable } from '@/components/ui/AppPressable';
import { AppTextField } from '@/components/ui/AppTextField';
import { FormScreen } from '@/components/ui/FormScreen';
import { ListRow } from '@/components/ui/ListRow';
import { ThemedTextInput } from '@/components/ui/ThemedTextInput';
import { SkeletonList } from '@/components/ui/SkeletonRow';
import { useIngredients } from '@/features/ingredients/useIngredients';
import { useStockLevels } from '@/features/inventory/useStockLevels';
import { useAddRecipeLine } from '@/features/menu/useMenuItems';
import { canConvert, convertUnit } from '@/domain/calculations/units';
import { formatQuantity } from '@/lib/format';
import { useTheme } from '@/providers/ThemeProvider';
import { fontSize, fontWeight, radius, spacing } from '@/lib/theme';
import type { IngredientDto } from '@/api/ingredients-api';

/** Smaller unit to show a conversion hint in, e.g. 0.25 kg = 250 g. */
const HINT_UNIT: Record<string, string> = { kg: 'g', g: 'kg', L: 'ml', l: 'ml', ml: 'L' };
/** Portions used for the "how much will 10 sales use" preview. */
const PREVIEW_PORTIONS = 10;

export interface AddToRecipeSheetProps {
  visible: boolean;
  menuItemId: string;
  /** Ingredients already in the recipe — hidden from the list. */
  existingIngredientIds: string[];
  onClose: () => void;
  onAdded: (ingredientName: string) => void;
}

/**
 * Two-step sheet: pick an ingredient (search + live stock), then enter the quantity
 * per portion. One title; the subtitle (ingredient · unit) appears only in step 2.
 */
export function AddToRecipeSheet({ visible, menuItemId, existingIngredientIds, onClose, onAdded }: AddToRecipeSheetProps) {
  const { t, i18n } = useTranslation();
  const tk = useTheme();
  const { height } = useWindowDimensions();
  const { data: ingredients = [], isLoading, isError, refetch } = useIngredients();
  const { data: stockLevels = [] } = useStockLevels();
  const addLine = useAddRecipeLine(menuItemId);

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<IngredientDto | null>(null);
  const [qty, setQty] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setSearch('');
    setSelected(null);
    setQty('');
    setTouched(false);
    setError(null);
  };
  const close = () => {
    reset();
    onClose();
  };

  const available = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ingredients
      .filter((i) => !existingIngredientIds.includes(i.id))
      .filter((i) => !q || i.name.toLowerCase().includes(q));
  }, [ingredients, existingIngredientIds, search]);

  const qtyNum = parseFloat(qty);
  const qtyError = Number.isFinite(qtyNum) && qtyNum > 0 ? null : t('menuItem.qtyInvalid');

  const stockFor = (ingredientId: string) => stockLevels.find((s) => s.ingredient_id === ingredientId);

  const hint = useMemo(() => {
    if (!selected || qtyError) return null;
    const target = HINT_UNIT[selected.unit];
    if (!target || !canConvert(selected.unit, target)) return null;
    return `${formatQuantity(qtyNum, i18n.language)} ${selected.unit} = ${formatQuantity(convertUnit(qtyNum, selected.unit, target), i18n.language)} ${target}`;
  }, [selected, qtyError, qtyNum, i18n.language]);

  const submit = async () => {
    setTouched(true);
    if (!selected || qtyError) return;
    setError(null);
    try {
      await addLine.mutateAsync({ ingredient_id: selected.id, qty_per_portion: String(qtyNum), unit: selected.unit });
      const name = selected.name;
      reset();
      onAdded(name);
    } catch {
      setError(t('menuItem.addLineError'));
    }
  };

  const openCreate = () => {
    const query = search.trim();
    close();
    router.push(
      query
        ? (`/(app)/ingredients/create?prefill=${encodeURIComponent(query)}` as never)
        : ('/(app)/ingredients/create' as never),
    );
  };

  const selectedStock = selected ? stockFor(selected.id) : undefined;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <View style={[styles.backdrop, { backgroundColor: tk.overlay }]}>
        <Pressable style={styles.flex} onPress={close} accessibilityRole="button" accessibilityLabel={t('common.close')} />
        <View style={[styles.sheet, { height: height * 0.8, backgroundColor: tk.surface }]} accessibilityViewIsModal>
          <View style={styles.header}>
            {selected ? (
              <AppPressable
                onPress={() => { setSelected(null); setQty(''); setTouched(false); }}
                accessibilityRole="button"
                accessibilityLabel={t('menuItem.changeIngredient')}
                hitSlop={8}
                style={styles.iconBtn}
              >
                <ChevronLeft size={22} color={tk.text} />
              </AppPressable>
            ) : null}
            <View style={styles.flex}>
              <Text style={[styles.title, { color: tk.text }]} accessibilityRole="header">
                {t('menuItem.addIngredient')}
              </Text>
              {selected ? (
                <Text style={[styles.subtitle, { color: tk.textMuted }]}>
                  {t('menuItem.addIngredientSubtitle', { name: selected.name, unit: selected.unit })}
                </Text>
              ) : null}
            </View>
            <AppPressable onPress={close} accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={8} style={styles.iconBtn}>
              <X size={22} color={tk.textMuted} />
            </AppPressable>
          </View>

          {selected ? (
            <FormScreen
              actions={[
                {
                  kind: 'create',
                  label: t('menuItem.addToRecipe'),
                  onPress: () => void submit(),
                  loading: addLine.isPending,
                  disabled: Boolean(qtyError),
                },
              ]}
            >
              <AppTextField
                label={t('menuItem.qtyPerPortion')}
                value={qty}
                onChangeText={(v) => { setQty(v.replace(',', '.')); setTouched(true); }}
                placeholder="0.25"
                keyboardType="decimal-pad"
                autoFocus
                suffix={selected.unit}
                error={touched && qtyError ? qtyError : undefined}
                returnKeyType="done"
                inputProps={{ onSubmitEditing: () => void submit() }}
              />
              {hint ? <Text style={{ color: tk.textMuted, fontSize: fontSize.sm }}>{hint}</Text> : null}
              {!qtyError ? (
                <Text style={{ color: tk.textMuted, fontSize: fontSize.sm }}>
                  {t('menuItem.usagePreview', {
                    count: PREVIEW_PORTIONS,
                    qty: formatQuantity(qtyNum * PREVIEW_PORTIONS, i18n.language),
                    unit: selected.unit,
                  })}
                </Text>
              ) : null}
              <Text style={{ color: tk.textMuted, fontSize: fontSize.sm }}>
                {selectedStock
                  ? t('menuItem.inStockQty', { qty: formatQuantity(selectedStock.current_stock, i18n.language), unit: selectedStock.unit })
                  : t('menuItem.noStockRecorded')}
              </Text>
              {error ? (
                <Text style={{ color: tk.danger, fontSize: fontSize.sm }} accessibilityRole="alert">{error}</Text>
              ) : null}
            </FormScreen>
          ) : (
            <FormScreen contentContainerStyle={{ gap: spacing.sm }}>
              <ThemedTextInput
                value={search}
                onChangeText={setSearch}
                placeholder={t('menuItem.searchIngredients')}
                accessibilityLabel={t('menuItem.searchIngredients')}
                autoCorrect={false}
                style={[styles.search, { backgroundColor: tk.surfaceRaised, borderColor: tk.border, color: tk.text }]}
              />

              {isLoading ? (
                <SkeletonList count={4} />
              ) : isError ? (
                <View style={styles.center}>
                  <Text style={{ color: tk.text, fontWeight: fontWeight.semibold }}>{t('menuItem.loadIngredientsError')}</Text>
                  <AppPressable onPress={() => void refetch()} accessibilityRole="button" style={styles.retry}>
                    <RefreshCw size={14} color={tk.link} />
                    <Text style={{ color: tk.link, fontWeight: fontWeight.semibold }}>{t('menuItem.tryAgain')}</Text>
                  </AppPressable>
                </View>
              ) : (
                <View style={[styles.list, { backgroundColor: tk.surfaceRaised, borderColor: tk.border }]}>
                  {available.map((ing) => {
                    const stock = stockFor(ing.id);
                    return (
                      <ListRow
                        key={ing.id}
                        icon={<Package size={18} color={tk.link} strokeWidth={1.75} />}
                        iconBg={tk.primaryTint}
                        title={ing.name}
                        subtitle={
                          stock
                            ? t('menuItem.inStockQty', { qty: formatQuantity(stock.current_stock, i18n.language), unit: stock.unit })
                            : t('menuItem.noStockRecorded')
                        }
                        onPress={() => setSelected(ing)}
                        accessibilityLabel={t('menuItem.pickIngredient', { name: ing.name })}
                      />
                    );
                  })}
                  {available.length === 0 ? (
                    <Text style={[styles.empty, { color: tk.textMuted }]}>
                      {ingredients.length === 0
                        ? t('menuItem.noIngredientsInStock')
                        : search.trim()
                          ? t('menuItem.noIngredientMatch', { query: search.trim() })
                          : t('menuItem.allIngredientsInRecipe')}
                    </Text>
                  ) : null}
                  <ListRow
                    icon={<Plus size={18} color={tk.link} strokeWidth={2.5} />}
                    iconBg={tk.primaryTint}
                    title={search.trim() ? t('menuItem.createNamed', { name: search.trim() }) : t('menuItem.createNew')}
                    onPress={openCreate}
                    separator={false}
                    chevron={false}
                  />
                </View>
              )}
            </FormScreen>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  subtitle: { fontSize: fontSize.sm, marginTop: 2 },
  search: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: fontSize.base,
    minHeight: 48,
  },
  list: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  empty: { padding: spacing.md, textAlign: 'center', fontSize: fontSize.sm },
  center: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
});
