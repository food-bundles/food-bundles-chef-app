/**
 * 09 · Dish recipe (Food Bundles UX spec). One form to create or edit a dish: name, selling
 * price, category, on/off for today's menu, the ingredients for 1 portion with their Food
 * Bundles price and line cost, and the cost card. Save is in the header.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, Plus, X } from 'lucide-react-native';
import { AppPressable } from '@/components/ui/AppPressable';
import { AppTextField } from '@/components/ui/AppTextField';
import { SelectableChip } from '@/components/ui/SelectableChip';
import { useTheme } from '@/providers/ThemeProvider';
import { fontSize, fontWeight, MIN_TOUCH_SIZE, radius, spacing } from '@/lib/theme';
import { formatAmount, formatPerUnit, minorUnits, sanitisePriceInput } from '@/lib/money';
import { useKitchenStore } from '@/store/kitchen-store';
import { useSessionStore } from '@/store/session-store';
import { useMenuItems, useRecipeLines } from '@/features/menu/useMenuItems';
import { useIngredients } from '@/features/ingredients/useIngredients';
import { useCatalog } from '@/features/purchasing/useCatalog';
import { analyzeDish, useAiFeatures } from '@/features/ai/api';
import { prepareImageForAi } from '@/features/ai/image-prep';
import { AiError } from '@/features/ai/ai-client';
import { AddIngredientSheet } from '@/features/menu/AddIngredientSheet';
import {
  draftCustom,
  draftFromCatalog,
  draftFromIngredient,
  draftsFromRecipe,
  parseQty,
  saveDish,
  type DraftLine,
} from '@/features/menu/dish-form';
import { costPerPortion, dishMargin, lineCost } from '@/domain/calculations/recipe-cost';
import { MENU_ITEM_CATEGORIES, type MenuItemCategory } from '@/api/menus-api';
import { queryKeys } from '@/api/query-keys';

export default function DishRecipeScreen() {
  const { t, i18n } = useTranslation();
  const tk = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const kitchen = useKitchenStore((s) => s.activeKitchen);
  const chefId = useSessionStore((s) => s.chef?.id ?? '');
  const currency = kitchen?.currency ?? '';
  const decimals = currency ? minorUnits(currency) : 0;

  const items = useMenuItems();
  const item = useMemo(() => (id ? items.data?.find((m) => m.id === id) : undefined), [id, items.data]);
  const recipe = useRecipeLines(id ?? '');
  const ingredients = useIngredients();
  const catalog = useCatalog();
  const { features } = useAiFeatures();

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<MenuItemCategory | null>(null);
  const [active, setActive] = useState(true);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [loaded, setLoaded] = useState(!id);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const qtyRefs = useRef<Record<string, TextInput | null>>({});

  useEffect(() => {
    if (loaded || !id || !item || !recipe.data || !ingredients.data) return;
    setName(item.name);
    setPrice(item.selling_price_money?.amount ?? item.selling_price);
    setCategory(item.category ?? null);
    setActive(item.is_active);
    setLines(draftsFromRecipe(recipe.data, ingredients.data));
    setLoaded(true);
  }, [loaded, id, item, recipe.data, ingredients.data]);

  const sellingPrice = Number(price.replace(',', '.'));
  const costLines = lines.map((l) => ({
    qty: parseQty(l.qty) ?? 0,
    pricePerUnit: l.priceCurrency === currency ? l.pricePerUnit : null,
  }));
  const cost = costPerPortion(costLines, decimals);
  const margin = dishMargin(Number.isFinite(sellingPrice) ? sellingPrice : 0, cost.total, decimals);
  const canSave = name.trim().length > 0 && price.trim().length > 0 && Number.isFinite(sellingPrice) && !saving;

  const updateLine = (key: string, patch: Partial<DraftLine>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const removeLine = (key: string) => setLines((prev) => prev.filter((l) => l.key !== key));
  const addLine = (line: DraftLine) => {
    setLines((prev) => [...prev, line]);
    setTimeout(() => qtyRefs.current[line.key]?.focus(), 350);
  };

  const onSave = async () => {
    if (!kitchen || !canSave) return;
    setSaving(true);
    setError(null);
    try {
      await saveDish(
        kitchen.id,
        {
          itemId: item?.id,
          menuId: item?.menu_id,
          name,
          price: String(sellingPrice),
          currency,
          category,
          isActive: active,
        },
        lines,
        recipe.data ?? [],
        ingredients.data ?? [],
        t('createItem.defaultMenuName'),
      );
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['menu'] }),
        qc.invalidateQueries({ queryKey: queryKeys.catalog.ingredients(chefId, kitchen.id) }),
      ]);
      router.back();
    } catch {
      setError(t('dish.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const fromPhoto = async (fromCamera: boolean) => {
    if (!kitchen) return;
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') return;
    const picked = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    const asset = picked.canceled ? undefined : picked.assets[0];
    if (!asset) return;
    setPhotoBusy(true);
    setError(null);
    try {
      const image = await prepareImageForAi(asset.uri, 'dish');
      const controller = new AbortController();
      const result = await analyzeDish(kitchen.id, image, i18n.language, name, {
        signal: controller.signal,
        onProgress: () => undefined,
        onUploaded: () => undefined,
      });
      if (!name.trim() && result.dish_name) setName(result.dish_name);
      if (!category && result.category) setCategory(result.category);
      const known = ingredients.data ?? [];
      const products = catalog.data ?? [];
      setLines((prev) => {
        const next = [...prev];
        for (const ing of result.ingredients) {
          const qty = String(Number(ing.qty_per_portion) || '');
          const kitchenIng = ing.ingredient_id ? known.find((k) => k.id === ing.ingredient_id) : undefined;
          const product = products.find((p) => p.name.trim().toLowerCase() === ing.name.trim().toLowerCase());
          const draft = kitchenIng
            ? draftFromIngredient(kitchenIng, qty)
            : product
              ? draftFromCatalog(product, known, qty)
              : draftCustom(ing.name, ing.unit, null, currency, qty);
          const dup = next.some(
            (l) =>
              (draft.ingredientId && l.ingredientId === draft.ingredientId) ||
              (draft.catalogProductId && l.catalogProductId === draft.catalogProductId),
          );
          if (!dup) next.push(draft);
        }
        return next;
      });
    } catch (err) {
      setError(t(err instanceof AiError ? `ai.errors.${err.code}` : 'ai.errors.server'));
    } finally {
      setPhotoBusy(false);
    }
  };

  const pickPhotoSource = () =>
    Alert.alert(t('dish.fromPhoto'), t('dish.fromPhotoHint'), [
      { text: t('common.camera'), onPress: () => void fromPhoto(true) },
      { text: t('common.gallery'), onPress: () => void fromPhoto(false) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: tk.surface }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, backgroundColor: tk.surfaceRaised, borderBottomColor: tk.border }]}>
        <AppPressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('common.back')} style={styles.iconBtn}>
          <ChevronLeft size={26} color={tk.text} />
        </AppPressable>
        <Text style={[styles.title, { color: tk.text }]} accessibilityRole="header">
          {t('dish.title')}
        </Text>
        <AppPressable
          onPress={() => void onSave()}
          disabled={!canSave}
          accessibilityRole="button"
          accessibilityLabel={t('dish.save')}
          accessibilityState={{ disabled: !canSave, busy: saving }}
          style={({ pressed }) => [styles.saveBtn, { backgroundColor: tk.primaryTint }, (!canSave || pressed) && styles.dim]}
        >
          <Text style={[styles.saveText, { color: tk.onPrimaryTint }]}>{saving ? t('dish.saving') : t('dish.save')}</Text>
        </AppPressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: tk.surfaceRaised, borderColor: tk.border }]}>
          <AppTextField label={t('dish.name')} value={name} onChangeText={setName} returnKeyType="next" />
          <AppTextField
            label={t('dish.sellingPrice', { currency })}
            value={price}
            onChangeText={(v) => setPrice(sanitisePriceInput(v, currency))}
            keyboardType="decimal-pad"
          />
          <View style={styles.chips}>
            {MENU_ITEM_CATEGORIES.map((c) => (
              <SelectableChip
                key={c}
                label={t(`menu.categories.${c}`)}
                selected={category === c}
                onPress={() => setCategory(category === c ? null : c)}
              />
            ))}
          </View>
          <View style={styles.switchRow}>
            <View style={styles.flex}>
              <Text style={[styles.switchLabel, { color: tk.text }]}>{t('dish.onMenu')}</Text>
              <Text style={[styles.muted, { color: tk.textMuted }]}>{active ? t('dish.onMenuHint') : t('dish.offMenuHint')}</Text>
            </View>
            <Switch
              value={active}
              onValueChange={setActive}
              accessibilityLabel={t('dish.onMenu')}
              trackColor={{ true: tk.primary, false: tk.border }}
            />
          </View>
        </View>

        <View style={styles.sectionRow}>
          <Text style={[styles.section, { color: tk.textMuted }]}>{t('dish.ingredientsFor1')}</Text>
          <Text style={[styles.sectionRight, { color: tk.textMuted }]}>{t('dish.cost')}</Text>
        </View>

        {lines.length > 0 ? (
          <View style={[styles.card, styles.linesCard, { backgroundColor: tk.surfaceRaised, borderColor: tk.border }]}>
            {lines.map((line, i) => {
              const qty = parseQty(line.qty);
              const lc = lineCost({ qty: qty ?? 0, pricePerUnit: line.priceCurrency === currency ? line.pricePerUnit : null }, decimals);
              const priceText =
                line.pricePerUnit !== null && line.priceCurrency
                  ? formatPerUnit(line.pricePerUnit, line.priceCurrency, currency, line.unit, i18n.language)
                  : t('dish.noPrice');
              const next = lines[i + 1];
              return (
                <View key={line.key} style={[styles.line, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tk.border }]}>
                  <View style={styles.lineName}>
                    <Text style={[styles.ingName, { color: tk.text }]} numberOfLines={2}>
                      {line.name}
                    </Text>
                    <Text style={[styles.muted, { color: tk.textMuted }]} numberOfLines={1}>
                      {line.fbPrice ? priceText : `${priceText} · ${t('dish.ownPrice')}`}
                    </Text>
                  </View>
                  <TextInput
                    ref={(r) => {
                      qtyRefs.current[line.key] = r;
                    }}
                    value={line.qty}
                    onChangeText={(v) => updateLine(line.key, { qty: v.replace(/[^0-9.,]/g, '') })}
                    keyboardType="decimal-pad"
                    returnKeyType={next ? 'next' : 'done'}
                    onSubmitEditing={() => (next ? qtyRefs.current[next.key]?.focus() : undefined)}
                    accessibilityLabel={t('dish.qtyLabel', { name: line.name, unit: line.unit })}
                    placeholder="0"
                    placeholderTextColor={tk.placeholder}
                    style={[styles.qty, { color: tk.text, borderColor: tk.border, backgroundColor: tk.surfaceRaised }]}
                  />
                  <Text style={[styles.unit, { color: tk.textMuted }]}>{line.unit}</Text>
                  <Text style={[styles.lineCost, { color: tk.text }]}>{lc !== null && qty !== null ? formatAmount(lc, currency, i18n.language) : '—'}</Text>
                  <AppPressable
                    onPress={() => removeLine(line.key)}
                    accessibilityRole="button"
                    accessibilityLabel={t('dish.removeNamed', { name: line.name })}
                    style={styles.remove}
                    hitSlop={6}
                  >
                    <X size={16} color={tk.textMuted} />
                  </AppPressable>
                </View>
              );
            })}
          </View>
        ) : loaded ? (
          <Text style={[styles.muted, { color: tk.textMuted }]}>{t('dish.noIngredients')}</Text>
        ) : null}

        <AppPressable
          onPress={() => setSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('dish.addIngredient')}
          style={({ pressed }) => [styles.addBtn, { borderColor: tk.border }, pressed && styles.dim]}
        >
          <Plus size={20} color={tk.link} />
          <Text style={[styles.addText, { color: tk.link }]}>{photoBusy ? t('dish.photoWorking') : t('dish.addIngredient')}</Text>
        </AppPressable>

        <View style={[styles.card, { backgroundColor: tk.surfaceRaised, borderColor: tk.border }]}>
          <CostRow label={t('dish.costPerPortion')} value={`${formatAmount(cost.total, currency, i18n.language)}${cost.complete ? '' : ' *'}`} />
          <CostRow label={t('dish.sellingPriceShort')} value={Number.isFinite(sellingPrice) && price ? formatAmount(sellingPrice, currency, i18n.language) : '—'} />
          <CostRow
            label={t('dish.margin', { currency })}
            value={
              Number.isFinite(sellingPrice) && price
                ? `${formatAmount(margin.amount, currency, i18n.language)}${margin.fraction !== null ? ` · ${(Math.round(margin.fraction * 1000) / 10).toFixed(1)} %` : ''}`
                : '—'
            }
            strong
          />
          {!cost.complete ? <Text style={[styles.muted, { color: tk.textMuted }]}>{t('dish.costIncomplete')}</Text> : null}
        </View>

        {error ? (
          <Text style={[styles.error, { color: tk.danger }]} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
      </ScrollView>

      <AddIngredientSheet
        visible={sheetOpen}
        catalog={catalog.data ?? []}
        ingredients={ingredients.data ?? []}
        takenIngredientIds={lines.map((l) => l.ingredientId).filter((v): v is string => Boolean(v))}
        takenCatalogIds={lines.map((l) => l.catalogProductId).filter((v): v is string => Boolean(v))}
        currency={currency}
        photoAvailable={features.dish_analysis}
        onAdd={addLine}
        onFromPhoto={pickPhotoSource}
        onClose={() => setSheetOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}

function CostRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  const tk = useTheme();
  return (
    <View style={styles.costRow}>
      <Text style={[styles.costLabel, { color: tk.textMuted }]}>{label}</Text>
      <Text style={[strong ? styles.costStrong : styles.costValue, { color: strong ? tk.link : tk.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: { width: MIN_TOUCH_SIZE, height: MIN_TOUCH_SIZE, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  saveBtn: { minHeight: MIN_TOUCH_SIZE, paddingHorizontal: spacing.md + 4, borderRadius: radius.full, justifyContent: 'center' },
  saveText: { fontSize: fontSize.base, fontWeight: fontWeight.bold },
  dim: { opacity: 0.5 },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing['2xl'] },
  card: { borderRadius: radius.xl, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md, gap: spacing.md },
  linesCard: { paddingVertical: 0, gap: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: MIN_TOUCH_SIZE },
  switchLabel: { fontSize: fontSize.base, fontWeight: fontWeight.semibold },
  muted: { fontSize: fontSize.sm },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  section: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, letterSpacing: 1.2, textTransform: 'uppercase' },
  sectionRight: { fontSize: fontSize.sm },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm + 2 },
  lineName: { flex: 1, minWidth: 0 },
  ingName: { fontSize: fontSize.base, fontWeight: fontWeight.semibold },
  qty: {
    width: 76,
    minHeight: MIN_TOUCH_SIZE + 4,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    textAlign: 'right',
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  unit: { width: 28, fontSize: fontSize.base },
  lineCost: { width: 60, textAlign: 'right', fontSize: fontSize.base, fontWeight: fontWeight.bold },
  remove: { width: 28, height: MIN_TOUCH_SIZE, alignItems: 'center', justifyContent: 'center' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: MIN_TOUCH_SIZE + 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: radius.xl,
  },
  addText: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  costLabel: { fontSize: fontSize.base },
  costValue: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  costStrong: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  error: { fontSize: fontSize.sm, textAlign: 'center' },
});
