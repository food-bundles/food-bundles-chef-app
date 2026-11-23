/**
 * Screen 09 "Add ingredient": search the Food Bundles catalogue (and the kitchen's own
 * ingredients); add a custom ingredient when it is missing. "From a photo" (dish analysis) is
 * a secondary option (Phase 8 feature folded in, approved).
 */
import { useMemo, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Camera, Plus, X } from 'lucide-react-native';
import { AppPressable } from '@/components/ui/AppPressable';
import { AppButton } from '@/components/ui/AppButton';
import { AppTextField } from '@/components/ui/AppTextField';
import { SearchInput } from '@/components/ui/SearchInput';
import { SelectableChip } from '@/components/ui/SelectableChip';
import { useTheme } from '@/providers/ThemeProvider';
import { fontSize, fontWeight, MIN_TOUCH_SIZE, radius, spacing } from '@/lib/theme';
import { formatPerUnit } from '@/lib/money';
import type { CatalogProductDto } from '@/api/catalog-api';
import type { IngredientDto } from '@/api/ingredients-api';
import { draftCustom, draftFromCatalog, draftFromIngredient, type DraftLine } from './dish-form';

const BASE_UNITS = ['kg', 'L', 'pcs'] as const;

export interface AddIngredientSheetProps {
  visible: boolean;
  catalog: readonly CatalogProductDto[];
  ingredients: readonly IngredientDto[];
  /** Ingredients already in the recipe (shown as added). */
  takenIngredientIds: readonly string[];
  takenCatalogIds: readonly string[];
  currency: string;
  /** A secondary AI option under the list ("From a photo", "Scan receipt"); hidden when absent. */
  secondaryAction?: { label: string; onPress: () => void };
  /** Sheet title (defaults to "Add ingredient"). */
  title?: string;
  onAdd: (line: DraftLine) => void;
  onClose: () => void;
}

type Row =
  | { kind: 'catalog'; product: CatalogProductDto }
  | { kind: 'ingredient'; ingredient: IngredientDto };

/** Catalogue first, then the kitchen's custom ingredients (those not linked to the catalogue). */
export function searchIngredientRows(
  query: string,
  catalog: readonly CatalogProductDto[],
  ingredients: readonly IngredientDto[],
): Row[] {
  const q = query.trim().toLowerCase();
  const match = (name: string) => !q || name.toLowerCase().includes(q);
  const rows: Row[] = catalog.filter((p) => p.is_active && match(p.name)).map((product) => ({ kind: 'catalog', product }));
  for (const ingredient of ingredients) {
    if (!ingredient.catalog_product_id && match(ingredient.name)) rows.push({ kind: 'ingredient', ingredient });
  }
  return rows.slice(0, 60);
}

export function AddIngredientSheet({
  visible,
  catalog,
  ingredients,
  takenIngredientIds,
  takenCatalogIds,
  currency,
  secondaryAction,
  title,
  onAdd,
  onClose,
}: AddIngredientSheetProps) {
  const { t, i18n } = useTranslation();
  const tk = useTheme();
  const [query, setQuery] = useState('');
  const [custom, setCustom] = useState<{ name: string; unit: string; price: string } | null>(null);
  const rows = useMemo(() => searchIngredientRows(query, catalog, ingredients), [query, catalog, ingredients]);

  const close = () => {
    setQuery('');
    setCustom(null);
    onClose();
  };
  const add = (line: DraftLine) => {
    onAdd(line);
    close();
  };

  const renderRow = ({ item }: { item: Row }) => {
    const isCatalog = item.kind === 'catalog';
    const name = isCatalog ? item.product.name : item.ingredient.name;
    const unit = isCatalog ? item.product.unit : item.ingredient.unit;
    const taken = isCatalog
      ? takenCatalogIds.includes(item.product.id)
      : takenIngredientIds.includes(item.ingredient.id);
    const money = isCatalog ? item.product.reference_price_money : null;
    const priceText = isCatalog
      ? money
        ? formatPerUnit(money.amount, money.currency, currency, unit, i18n.language)
        : t('dish.noFbPrice')
      : item.ingredient.cost_per_unit !== null
        ? `${formatPerUnit(item.ingredient.cost_per_unit, item.ingredient.cost_per_unit_currency ?? currency, currency, unit, i18n.language)} · ${t('dish.ownPrice')}`
        : t('dish.ownPrice');
    return (
      <AppPressable
        disabled={taken}
        onPress={() => add(isCatalog ? draftFromCatalog(item.product, ingredients) : draftFromIngredient(item.ingredient))}
        accessibilityRole="button"
        accessibilityLabel={taken ? t('dish.alreadyAdded', { name }) : t('dish.addNamed', { name })}
        style={({ pressed }) => [styles.row, { borderBottomColor: tk.border }, pressed && styles.pressed, taken && styles.taken]}
      >
        <View style={styles.rowText}>
          <Text style={[styles.rowName, { color: tk.text }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.rowSub, { color: tk.textMuted }]} numberOfLines={1}>
            {priceText}
          </Text>
        </View>
        <Text style={[styles.rowAction, { color: taken ? tk.textMuted : tk.link }]}>{taken ? t('dish.added') : t('dish.add')}</Text>
      </AppPressable>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <View style={[styles.root, { backgroundColor: tk.surface }]}>
        <View style={[styles.header, { backgroundColor: tk.surfaceRaised, borderBottomColor: tk.border }]}>
          <Text style={[styles.title, { color: tk.text }]} accessibilityRole="header">
            {title ?? t('dish.addIngredient')}
          </Text>
          <AppPressable onPress={close} accessibilityRole="button" accessibilityLabel={t('common.close')} style={styles.close}>
            <X size={22} color={tk.text} />
          </AppPressable>
        </View>

        {custom ? (
          <View style={styles.custom}>
            <Text style={[styles.hint, { color: tk.textMuted }]}>{t('dish.customHint')}</Text>
            <AppTextField label={t('dish.customName')} value={custom.name} onChangeText={(name) => setCustom({ ...custom, name })} />
            <View style={styles.units}>
              {BASE_UNITS.map((u) => (
                <SelectableChip key={u} label={u} selected={custom.unit === u} onPress={() => setCustom({ ...custom, unit: u })} />
              ))}
            </View>
            <AppTextField
              label={t('dish.customPrice', { unit: custom.unit, currency })}
              value={custom.price}
              keyboardType="decimal-pad"
              onChangeText={(price) => setCustom({ ...custom, price: price.replace(/[^0-9.,]/g, '') })}
            />
            <AppButton
              label={t('dish.addCustom')}
              size="lg"
              disabled={!custom.name.trim()}
              onPress={() => {
                const price = Number(custom.price.replace(',', '.'));
                add(draftCustom(custom.name, custom.unit, custom.price && Number.isFinite(price) ? price : null, currency));
              }}
            />
            <AppButton label={t('common.back')} variant="ghost" onPress={() => setCustom(null)} />
          </View>
        ) : (
          <>
            <View style={styles.search}>
              <SearchInput value={query} onChangeText={setQuery} placeholder={t('dish.searchCatalog')} />
            </View>
            <FlatList
              data={rows}
              keyExtractor={(r) => (r.kind === 'catalog' ? `c-${r.product.id}` : `i-${r.ingredient.id}`)}
              renderItem={renderRow}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={[styles.empty, { color: tk.textMuted }]}>{t('dish.noResults')}</Text>}
              ListFooterComponent={
                <View style={styles.footer}>
                  <AppPressable
                    onPress={() => setCustom({ name: query.trim(), unit: 'kg', price: '' })}
                    accessibilityRole="button"
                    accessibilityLabel={query.trim() ? t('dish.addCustomNamed', { name: query.trim() }) : t('dish.addCustom')}
                    style={({ pressed }) => [styles.footerRow, { borderColor: tk.border }, pressed && styles.pressed]}
                  >
                    <Plus size={18} color={tk.link} />
                    <Text style={[styles.footerText, { color: tk.link }]}>
                      {query.trim() ? t('dish.addCustomNamed', { name: query.trim() }) : t('dish.addCustom')}
                    </Text>
                  </AppPressable>
                  {secondaryAction ? (
                    <AppPressable
                      onPress={() => {
                        close();
                        secondaryAction.onPress();
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={secondaryAction.label}
                      style={({ pressed }) => [styles.footerRow, { borderColor: tk.border }, pressed && styles.pressed]}
                    >
                      <Camera size={18} color={tk.textMuted} />
                      <Text style={[styles.footerText, { color: tk.textMuted }]}>{secondaryAction.label}</Text>
                    </AppPressable>
                  ) : null}
                </View>
              }
            />
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  close: { width: MIN_TOUCH_SIZE, height: MIN_TOUCH_SIZE, alignItems: 'center', justifyContent: 'center' },
  search: { padding: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 60,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1, minWidth: 0 },
  rowName: { fontSize: fontSize.base, fontWeight: fontWeight.semibold },
  rowSub: { fontSize: fontSize.sm },
  rowAction: { fontSize: fontSize.base, fontWeight: fontWeight.bold },
  pressed: { opacity: 0.7 },
  taken: { opacity: 0.5 },
  empty: { padding: spacing.md, fontSize: fontSize.base },
  footer: { padding: spacing.md, gap: spacing.sm },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: MIN_TOUCH_SIZE + 8,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
  },
  footerText: { fontSize: fontSize.base, fontWeight: fontWeight.semibold },
  custom: { padding: spacing.md, gap: spacing.md },
  hint: { fontSize: fontSize.sm },
  units: { flexDirection: 'row', gap: spacing.sm },
});
