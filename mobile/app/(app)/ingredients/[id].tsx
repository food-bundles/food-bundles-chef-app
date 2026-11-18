import { useMemo, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Utensils, Pencil } from 'lucide-react-native';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import { AppPressable } from '@/components/ui/AppPressable';
import { AppTextField } from '@/components/ui/AppTextField';
import { FormScreen } from '@/components/ui/FormScreen';
import { ListRow } from '@/components/ui/ListRow';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StockIndicator } from '@/components/ui/StockIndicator';
import { useIngredientDetail, useStockLevels, useRecordInventoryEntry, useInventoryHistory } from '@/features/inventory/useStockLevels';
import { useMenuItems, useRecipeLines } from '@/features/menu/useMenuItems';
import { deleteIngredient, updateIngredient } from '@/api/ingredients-api';
import { queryKeys } from '@/api/query-keys';
import { useKitchenStore } from '@/store/kitchen-store';
import { useSessionStore } from '@/store/session-store';
import { formatDate, formatQuantity, formatRWF, formatTime } from '@/lib/format';
import { useTheme } from '@/providers/ThemeProvider';
import { spacing, fontSize, fontWeight, radius } from '@/lib/theme';
import type { FormAction } from '@/components/ui/FormActionButton';
import type { MenuItemDto } from '@/api/menus-api';

const ENTRY_TYPE_KEYS: Record<string, string> = {
  opening: 'ingredients.entryOpening',
  adjustment: 'ingredients.entryAdjustment',
  closing: 'ingredients.entryClosing',
  delivery: 'ingredients.entryDelivery',
  waste: 'ingredients.entryWaste',
  sale_use: 'ingredients.entrySaleUse',
};

function MenuItemUsageRow({ menuItem, ingredientId }: { menuItem: MenuItemDto; ingredientId: string }) {
  const { t, i18n } = useTranslation();
  const tk = useTheme();
  const { data: lines = [] } = useRecipeLines(menuItem.id);
  const matchedLine = lines.find((l) => l.ingredient_id === ingredientId);
  if (!matchedLine) return null;
  return (
    <ListRow
      icon={<Utensils size={16} color={tk.link} strokeWidth={2} />}
      iconBg={tk.primaryTint}
      title={menuItem.name}
      titleAccessory={!menuItem.is_active ? <StatusBadge label={t('ingredients.offMenu')} variant="warning" /> : undefined}
      subtitle={`${t('menuItem.perPortion', { qty: formatQuantity(matchedLine.qty_per_portion, i18n.language), unit: matchedLine.unit })} · ${formatRWF(menuItem.selling_price, i18n.language)}`}
      onPress={() => router.push(`/(app)/menu/${menuItem.id}` as never)}
    />
  );
}

export default function IngredientDetailScreen() {
  const { t, i18n } = useTranslation();
  const tk = useTheme();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const kitchenId = useKitchenStore((s) => s.activeKitchen?.id ?? '');
  const chefId = useSessionStore((s) => s.chef?.id ?? '');

  const { data: ingredient, isLoading: loadingIngredient } = useIngredientDetail(id ?? '');
  const { data: stockLevels = [] } = useStockLevels();
  const { data: history = [], isLoading: loadingHistory } = useInventoryHistory(id ?? '');
  const { data: allMenuItems = [] } = useMenuItems();
  const recordEntry = useRecordInventoryEntry();

  const [mode, setMode] = useState<'stock' | 'edit'>('stock');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjustTouched, setAdjustTouched] = useState(false);
  const [busy, setBusy] = useState<'add' | 'remove' | 'update' | 'delete' | null>(null);
  const [message, setMessage] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);

  const [editName, setEditName] = useState('');
  const [editCost, setEditCost] = useState('');
  const [editYield, setEditYield] = useState('');

  const stockLevel = stockLevels.find((s) => s.ingredient_id === id);
  const stock = stockLevel ? parseFloat(stockLevel.current_stock) : 0;
  const days = stockLevel?.days_cover != null ? parseFloat(stockLevel.days_cover) : Infinity;
  const isOut = stock <= 0;

  const qtyNum = parseFloat(adjustQty);
  const qtyError = Number.isFinite(qtyNum) && qtyNum > 0 ? null : t('ingredients.invalidQtyDesc');

  // Entries store the resulting level; show each entry's change from the one before it.
  const historyRows = useMemo(
    () =>
      history.slice(0, 20).map((entry, i) => {
        const level = parseFloat(entry.quantity);
        const previous = history[i + 1];
        const delta = previous ? level - parseFloat(previous.quantity) : null;
        return { entry, level, delta };
      }),
    [history],
  );

  const invalidateIngredient = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.catalog.ingredient(chefId, kitchenId, id ?? '') });
    void qc.invalidateQueries({ queryKey: queryKeys.catalog.ingredients(chefId, kitchenId) });
    void qc.invalidateQueries({ queryKey: queryKeys.inventory.stock(chefId, kitchenId) });
  };

  async function handleAdjust(change: 'add' | 'remove') {
    setAdjustTouched(true);
    if (!id || qtyError) return;
    setBusy(change);
    setMessage(null);
    try {
      await recordEntry.mutateAsync({
        ingredient_id: id,
        quantity: String(qtyNum),
        change,
        entry_type: 'adjustment',
        notes: adjustNote.trim() || null,
      });
      setAdjustQty('');
      setAdjustNote('');
      setAdjustTouched(false);
      setMessage({ kind: 'ok', text: change === 'add' ? t('ingredients.addedToStock') : t('ingredients.removedFromStock') });
    } catch {
      setMessage({ kind: 'error', text: t('ingredients.adjustErrorDesc') });
    } finally {
      setBusy(null);
    }
  }

  const startEdit = () => {
    if (!ingredient) return;
    setEditName(ingredient.name);
    setEditCost(ingredient.cost_per_unit ? String(Math.round(parseFloat(ingredient.cost_per_unit))) : '');
    setEditYield(String(Math.round(parseFloat(ingredient.yield_fraction) * 100)));
    setMessage(null);
    setMode('edit');
  };

  const yieldNum = parseFloat(editYield);
  const editErrors = {
    name: editName.trim().length < 2 ? t('ingredients.nameError') : null,
    yield: Number.isFinite(yieldNum) && yieldNum > 0 && yieldNum <= 100 ? null : t('ingredients.yieldError'),
  };

  async function handleUpdate() {
    if (!id || editErrors.name || editErrors.yield) return;
    setBusy('update');
    setMessage(null);
    try {
      await updateIngredient(kitchenId, id, {
        name: editName.trim(),
        cost_per_unit: editCost.trim() ? editCost.trim() : null,
        yield_fraction: String(yieldNum / 100),
      });
      invalidateIngredient();
      setMode('stock');
      setMessage({ kind: 'ok', text: t('ingredients.updated') });
    } catch {
      setMessage({ kind: 'error', text: t('ingredients.updateError') });
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete() {
    if (!id) return;
    setBusy('delete');
    try {
      await deleteIngredient(kitchenId, id);
      invalidateIngredient();
      router.back();
    } catch {
      setMessage({ kind: 'error', text: t('ingredients.deleteError') });
      setBusy(null);
    }
  }

  if (loadingIngredient || !ingredient) {
    return (
      <AppScreen>
        <AppHeader title={t('ingredients.detailTitle')} showBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: tk.surface }}>
          {loadingIngredient ? (
            <ActivityIndicator color={tk.primary} />
          ) : (
            <Text style={{ color: tk.textMuted, textAlign: 'center' }}>{t('ingredients.notFound')}</Text>
          )}
        </View>
      </AppScreen>
    );
  }

  const unit = ingredient.unit;
  const card = { backgroundColor: tk.surfaceRaised, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: tk.border, gap: spacing.sm };
  const sectionLabel = { color: tk.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textTransform: 'uppercase' as const, letterSpacing: 0.8 };

  const actions: FormAction[] =
    mode === 'stock'
      ? [
          {
            kind: 'create',
            label: qtyError ? t('ingredients.add') : t('ingredients.addQty', { qty: formatQuantity(qtyNum, i18n.language), unit }),
            onPress: () => void handleAdjust('add'),
            loading: busy === 'add',
            disabled: Boolean(qtyError) || busy !== null,
          },
          {
            kind: 'remove',
            label: t('ingredients.remove'),
            onPress: () => void handleAdjust('remove'),
            loading: busy === 'remove',
            disabled: Boolean(qtyError) || busy !== null,
            confirm: {
              title: t('ingredients.removeConfirmTitle'),
              message: t('ingredients.removeConfirmMessage', { qty: qtyError ? '0' : formatQuantity(qtyNum, i18n.language), unit, name: ingredient.name }),
              confirmLabel: t('ingredients.remove'),
              cancelLabel: t('common.cancel'),
            },
          },
        ]
      : [
          {
            kind: 'update',
            label: t('ingredients.saveChanges'),
            onPress: () => void handleUpdate(),
            loading: busy === 'update',
            disabled: Boolean(editErrors.name || editErrors.yield) || busy !== null,
          },
          {
            kind: 'remove',
            label: t('ingredients.deleteIngredient'),
            onPress: () => void handleDelete(),
            loading: busy === 'delete',
            disabled: busy !== null,
            confirm: {
              title: t('ingredients.deleteConfirmTitle'),
              message: t('ingredients.deleteConfirmMessage', { name: ingredient.name }),
              confirmLabel: t('ingredients.deleteIngredient'),
              cancelLabel: t('common.cancel'),
            },
          },
        ];

  return (
    <AppScreen edges={['top']}>
      <AppHeader
        title={ingredient.name}
        showBack
        right={
          mode === 'stock' ? (
            <AppPressable onPress={startEdit} accessibilityRole="button" accessibilityLabel={t('ingredients.editDetails')} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Pencil size={14} color={tk.link} />
              <Text style={{ color: tk.link, fontWeight: '600', fontSize: fontSize.sm }}>{t('menuItem.editItem')}</Text>
            </AppPressable>
          ) : (
            <AppPressable onPress={() => setMode('stock')} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ color: tk.link, fontWeight: '600', fontSize: fontSize.sm }}>{t('common.cancel')}</Text>
            </AppPressable>
          )
        }
      />
      <FormScreen actions={actions}>
        {message ? (
          <Text style={{ color: message.kind === 'error' ? tk.danger : tk.link, fontSize: fontSize.sm }} accessibilityRole="alert">
            {message.text}
          </Text>
        ) : null}

        {mode === 'edit' ? (
          <View style={card}>
            <AppTextField label={t('ingredients.nameSectionLabel')} value={editName} onChangeText={setEditName} error={editErrors.name ?? undefined} autoCapitalize="words" />
            <AppTextField
              label={t('ingredients.costPerUnitLabel', { unit })}
              value={editCost}
              onChangeText={(v) => setEditCost(v.replace(/[^0-9]/g, ''))}
              placeholder="0"
              keyboardType="number-pad"
              suffix={`RWF/${unit}`}
            />
            <Text style={{ color: tk.textMuted, fontSize: fontSize.xs }}>{t('ingredients.costHint')}</Text>
            <AppTextField
              label={t('ingredients.yieldLabel')}
              value={editYield}
              onChangeText={(v) => setEditYield(v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              suffix="%"
              error={editErrors.yield ?? undefined}
            />
            <Text style={{ color: tk.textMuted, fontSize: fontSize.xs }}>{t('ingredients.yieldHint')}</Text>
          </View>
        ) : (
          <>
            {/* Stock summary */}
            <View style={[card, isOut ? { backgroundColor: tk.dangerTint, borderColor: tk.danger } : null]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: tk.text, fontSize: fontSize.lg, fontWeight: '700' }}>{t('ingredients.currentStock')}</Text>
                {isOut ? <StatusBadge label={t('ingredients.outOfStock')} variant="danger" /> : <StockIndicator daysOfCover={days} />}
              </View>
              <Text style={{ color: isOut ? tk.danger : tk.text, fontSize: 36, fontWeight: '800', letterSpacing: -1 }}>
                {formatQuantity(stock, i18n.language)}
                <Text style={{ color: tk.textMuted, fontSize: fontSize.base, fontWeight: '500' }}> {unit}</Text>
              </Text>
              {stockLevel?.expected_daily_use ? (
                <Text style={{ color: tk.textMuted, fontSize: fontSize.sm }}>
                  {t('ingredients.dailyUse', { use: formatQuantity(stockLevel.expected_daily_use, i18n.language), unit })}
                  {Number.isFinite(days) ? t('ingredients.daysCover', { days: days.toFixed(1) }) : ''}
                </Text>
              ) : null}
              {stockLevel?.last_recorded_at ? (
                <Text style={{ color: tk.textMuted, fontSize: fontSize.xs }}>
                  {t('ingredients.lastUpdated', { date: `${formatDate(stockLevel.last_recorded_at, i18n.language)} · ${formatTime(stockLevel.last_recorded_at)}` })}
                </Text>
              ) : null}
            </View>

            {/* Adjust stock — the Add / Remove actions live in the action bar and footer */}
            <View style={card}>
              <Text style={{ color: tk.text, fontSize: fontSize.base, fontWeight: '600' }}>{t('ingredients.adjustStock')}</Text>
              <AppTextField
                label={t('ingredients.adjustQtyLabel')}
                value={adjustQty}
                onChangeText={(v) => { setAdjustQty(v.replace(',', '.')); setAdjustTouched(true); }}
                placeholder="0"
                keyboardType="decimal-pad"
                suffix={unit}
                error={adjustTouched && adjustQty !== '' && qtyError ? qtyError : undefined}
              />
              <AppTextField
                label={t('ingredients.noteLabel')}
                value={adjustNote}
                onChangeText={setAdjustNote}
                placeholder={t('ingredients.notePlaceholder')}
              />
            </View>

            {/* Details */}
            <View style={card}>
              <Text style={{ color: tk.text, fontSize: fontSize.base, fontWeight: '600' }}>{t('ingredients.detailsSection')}</Text>
              {[
                [t('ingredients.detailUnit'), unit],
                [t('ingredients.detailYield'), `${Math.round(parseFloat(ingredient.yield_fraction) * 100)}%`],
                [t('ingredients.detailCostPerUnit'), ingredient.cost_per_unit ? `${formatRWF(ingredient.cost_per_unit, i18n.language)}/${unit}` : t('ingredients.noCost')],
                ingredient.notes ? [t('ingredients.detailNotes'), ingredient.notes] : null,
              ]
                .filter((r): r is string[] => r !== null)
                .map(([label, value]) => (
                  <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
                    <Text style={{ color: tk.textMuted, fontSize: fontSize.sm, flex: 1 }}>{label}</Text>
                    <Text style={{ color: tk.text, fontSize: fontSize.sm, fontWeight: '500', flex: 1, textAlign: 'right' }}>{value}</Text>
                  </View>
                ))}
            </View>

            <Text style={sectionLabel}>{t('ingredients.usedInMenu')}</Text>
            {allMenuItems.length === 0 ? (
              <View style={[card, { alignItems: 'center' }]}>
                <Text style={{ color: tk.textMuted, fontSize: fontSize.sm, textAlign: 'center' }}>{t('ingredients.noMenuItems')}</Text>
              </View>
            ) : (
              <View style={{ backgroundColor: tk.surfaceRaised, borderRadius: radius.lg, borderWidth: 1, borderColor: tk.border, overflow: 'hidden' }}>
                {allMenuItems.map((menuItem) => (
                  <MenuItemUsageRow key={menuItem.id} menuItem={menuItem} ingredientId={id ?? ''} />
                ))}
              </View>
            )}

            <Text style={sectionLabel}>{t('ingredients.stockHistory')}</Text>
            {loadingHistory ? (
              <ActivityIndicator color={tk.primary} />
            ) : historyRows.length === 0 ? (
              <View style={[card, { alignItems: 'center' }]}>
                <Text style={{ color: tk.textMuted, fontSize: fontSize.sm }}>{t('ingredients.noHistory')}</Text>
              </View>
            ) : (
              <View style={{ gap: 6 }}>
                {historyRows.map(({ entry, level, delta }) => (
                  <View key={entry.id} style={[card, { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm + 2 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: tk.text, fontSize: fontSize.sm, fontWeight: '500' }}>
                        {t(ENTRY_TYPE_KEYS[entry.entry_type] ?? 'ingredients.entryAdjustment')}
                      </Text>
                      {entry.notes ? <Text style={{ color: tk.textMuted, fontSize: fontSize.xs }} numberOfLines={2}>{entry.notes}</Text> : null}
                      <Text style={{ color: tk.textMuted, fontSize: fontSize.xs, marginTop: 2 }}>
                        {formatDate(entry.recorded_at, i18n.language)} · {formatTime(entry.recorded_at)}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      {delta != null && delta !== 0 ? (
                        <Text style={{ color: delta > 0 ? tk.link : tk.danger, fontSize: fontSize.base, fontWeight: '700' }}>
                          {delta > 0 ? '+' : '−'}{formatQuantity(Math.abs(delta), i18n.language)} {unit}
                        </Text>
                      ) : null}
                      <Text style={{ color: tk.textMuted, fontSize: fontSize.xs }}>
                        {t('ingredients.levelAfter', { qty: formatQuantity(level, i18n.language), unit })}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </FormScreen>
    </AppScreen>
  );
}
