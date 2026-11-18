import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Image, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Sparkles, X, AlertTriangle, Plus, Check, PackagePlus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import { AppPressable } from '@/components/ui/AppPressable';
import { FormScreen } from '@/components/ui/FormScreen';
import { AppTextField } from '@/components/ui/AppTextField';
import { AppButton } from '@/components/ui/AppButton';
import { SelectableChip } from '@/components/ui/SelectableChip';
import { ListRow } from '@/components/ui/ListRow';
import { ThemedTextInput } from '@/components/ui/ThemedTextInput';
import { useKitchenStore } from '@/store/kitchen-store';
import { useSessionStore } from '@/store/session-store';
import { queryKeys } from '@/api/query-keys';
import { listMenus, createMenu, createMenuItem, addRecipeLine, MENU_ITEM_CATEGORIES, type MenuItemCategory } from '@/api/menus-api';
import { createIngredient } from '@/api/ingredients-api';
import { useMenuItems } from '@/features/menu/useMenuItems';
import { analyzeDish, useAiFeatures } from '@/features/ai/api';
import { useAiTask } from '@/features/ai/useAiTask';
import { AiError } from '@/features/ai/ai-client';
import { AiStatusPanel } from '@/features/ai/AiStatusPanel';
import type { DishAnalysis } from '@/features/ai/schemas';
import { detectAnomaly } from '@/domain/anomaly';
import { formatRWF } from '@/lib/format';
import { useTheme } from '@/providers/ThemeProvider';
import { spacing, fontSize, fontWeight, radius } from '@/lib/theme';

const COMMON_ITEMS = [
  'Brochettes', 'Ugali', 'Chips', 'Rice', 'Beans', 'Chicken Stew', 'Fish Fry',
  'Beef Stew', 'Chapati', 'Mandazi', 'Samosa', 'Pilau', 'Matoke', 'Nyama Choma',
  'Orange Juice', 'Passion Juice', 'Avocado Juice', 'Mango Juice', 'Soda', 'Water',
  'Milk Tea', 'Black Tea', 'Coffee', 'Hot Chocolate',
];

/** One AI-suggested ingredient the chef can accept, edit, remove or create in stock. */
interface IngredientDraft {
  key: string;
  name: string;
  qty: string;
  unit: string;
  ingredientId: string | null;
  accepted: boolean;
  creating: boolean;
}

function toDrafts(result: DishAnalysis): IngredientDraft[] {
  return result.ingredients.map((ing, i) => ({
    key: `${i}-${ing.name}`,
    name: ing.name,
    qty: ing.qty_per_portion,
    unit: ing.unit,
    ingredientId: ing.ingredient_id,
    accepted: ing.confidence >= 0.5,
    creating: false,
  }));
}

export default function CreateMenuItemScreen() {
  const { t, i18n } = useTranslation();
  const tk = useTheme();
  const params = useLocalSearchParams<{ photoUri?: string }>();
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  const chefId = useSessionStore((s) => s.chef?.id ?? '');
  const qc = useQueryClient();
  const { features } = useAiFeatures();
  const { data: existingItems = [] } = useMenuItems();

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().trim().min(2, t('createItem.nameError')).max(80),
        selling_price: z
          .string()
          .min(1, t('createItem.priceRequired'))
          .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, t('createItem.priceInvalid')),
        description: z.string().trim().max(200).optional().or(z.literal('')),
      }),
    [t],
  );
  type FormValues = z.infer<typeof schema>;

  const { control, handleSubmit, setValue, getValues, formState: { errors, isValid } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { name: '', selling_price: '', description: '' },
  });

  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [category, setCategory] = useState<MenuItemCategory | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(params.photoUri ?? null);
  const [drafts, setDrafts] = useState<IngredientDraft[]>([]);
  const [analysis, setAnalysis] = useState<DishAnalysis | null>(null);

  // useWatch (not watch()) keeps the component compatible with the React Compiler.
  const nameValue = useWatch({ control, name: 'name' });
  const sellingPriceValue = useWatch({ control, name: 'selling_price' });

  const dishTask = useAiTask<DishAnalysis>('dish', async (image, cb) => {
    const result = await analyzeDish(activeKitchen?.id ?? '', image, i18n.language, getValues('name').trim(), cb);
    if (result.ingredients.length === 0 && !result.dish_name && result.image_quality !== 'ok') {
      throw new AiError(result.image_quality === 'too_dark' ? 'too_dark' : 'blurry');
    }
    if (!cb.signal.aborted) {
      // Fill only what the chef has not already entered.
      setAnalysis(result);
      setDrafts(toDrafts(result));
      if (result.dish_name && !getValues('name').trim()) setValue('name', result.dish_name, { shouldValidate: true });
      if (result.category) setCategory((prev) => prev ?? result.category);
    }
    return result;
  });

  // A dish photo handed over from Scan Menu is analysed as soon as the feature is known to be on.
  const autoStarted = useRef(false);
  const runDish = dishTask.run;
  useEffect(() => {
    if (params.photoUri && features.dish_analysis && !autoStarted.current) {
      autoStarted.current = true;
      void runDish(params.photoUri);
    }
  }, [params.photoUri, features.dish_analysis, runDish]);

  const suggestions = useMemo(() => {
    const q = nameValue.trim().toLowerCase();
    if (!q) return [];
    const options = [...new Set([...existingItems.map((i) => i.name), ...COMMON_ITEMS])];
    return options.filter((n) => n.toLowerCase().includes(q) && n.toLowerCase() !== q).slice(0, 5);
  }, [nameValue, existingItems]);
  const showSuggestions = nameFocused && suggestions.length > 0;

  const priceAnomaly = useMemo((): 'high' | 'low' | false => {
    const entered = parseFloat(sellingPriceValue);
    if (isNaN(entered) || entered <= 0) return false;
    const peers = existingItems.map((i) => parseFloat(i.selling_price)).filter((p) => !isNaN(p) && p > 0);
    return detectAnomaly(entered, peers);
  }, [sellingPriceValue, existingItems]);

  const pickPhoto = async (fromCamera: boolean) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert(t('createItem.permissionTitle'), t('createItem.permissionBody'));
      return;
    }
    const options: ImagePicker.ImagePickerOptions = { allowsEditing: true, aspect: [4, 3], quality: 1 };
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
    const asset = result.canceled ? undefined : result.assets[0];
    if (asset) {
      setPhotoUri(asset.uri);
      setDrafts([]);
      setAnalysis(null);
      dishTask.reset();
      if (features.dish_analysis) void dishTask.run(asset.uri);
    }
  };

  const showPhotoPicker = () =>
    Alert.alert(t('createItem.addPhotoTitle'), t('createItem.addPhotoBody'), [
      { text: t('common.camera'), onPress: () => void pickPhoto(true) },
      { text: t('common.gallery'), onPress: () => void pickPhoto(false) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);

  const updateDraft = (key: string, patch: Partial<IngredientDraft>) =>
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));

  const createDraftInStock = async (draft: IngredientDraft) => {
    if (!activeKitchen) return;
    updateDraft(draft.key, { creating: true });
    try {
      const created = await createIngredient(activeKitchen.id, { name: draft.name.trim(), unit: draft.unit.trim() || 'kg' });
      updateDraft(draft.key, { ingredientId: created.id, creating: false, accepted: true });
      void qc.invalidateQueries({ queryKey: queryKeys.catalog.ingredients(chefId, activeKitchen.id) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stock(chefId, activeKitchen.id) });
    } catch {
      updateDraft(draft.key, { creating: false });
      setSaveError(t('createItem.createIngredientError', { name: draft.name }));
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!activeKitchen) return;
    setSaving(true);
    setSaveError(null);
    try {
      const menus = await listMenus(activeKitchen.id);
      let menuId = menus.find((m) => m.is_active)?.id;
      if (!menuId) menuId = (await createMenu(activeKitchen.id, { name: t('createItem.defaultMenuName') })).id;

      const item = await createMenuItem(activeKitchen.id, menuId, {
        name: values.name,
        selling_price: values.selling_price,
        description: values.description || null,
        category,
      });

      // Link accepted, stock-matched AI ingredients straight into the recipe.
      const lines = drafts.filter((d) => d.accepted && d.ingredientId && parseFloat(d.qty) > 0);
      const linked = await Promise.allSettled(
        lines.map((d) =>
          addRecipeLine(activeKitchen.id, item.id, {
            ingredient_id: d.ingredientId ?? '',
            qty_per_portion: d.qty,
            unit: d.unit,
          }),
        ),
      );
      void qc.invalidateQueries({ queryKey: queryKeys.menu.items(chefId, activeKitchen.id) });
      void qc.invalidateQueries({ queryKey: queryKeys.menu.recipe(chefId, activeKitchen.id, item.id) });

      if (linked.some((r) => r.status === 'rejected')) {
        router.replace(`/(app)/menu/${item.id}` as never);
        return;
      }
      router.back();
    } catch {
      setSaveError(t('createItem.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const unmatchedCount = drafts.filter((d) => d.accepted && !d.ingredientId).length;
  const sectionLabel = {
    color: tk.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  };

  return (
    <AppScreen>
      <AppHeader title={t('createItem.title')} showBack />
      <FormScreen
        actions={[
          {
            kind: 'create',
            label: t('createItem.saveButton'),
            onPress: () => void handleSubmit(onSubmit)(),
            loading: saving,
            disabled: !isValid,
          },
        ]}
        footerNote={
          !isValid ? (
            <Text style={{ color: tk.textMuted, fontSize: fontSize.xs, textAlign: 'center' }}>
              {t('createItem.formIncomplete')}
            </Text>
          ) : null
        }
      >
        {/* Photo + AI */}
        <View style={{ backgroundColor: tk.surfaceRaised, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: tk.border }}>
          {photoUri ? (
            <View>
              <Image source={{ uri: photoUri }} style={{ width: '100%', height: 180 }} resizeMode="cover" accessibilityIgnoresInvertColors />
              <AppPressable
                onPress={() => { setPhotoUri(null); setDrafts([]); setAnalysis(null); dishTask.reset(); }}
                accessibilityRole="button"
                accessibilityLabel={t('createItem.removePhoto')}
                hitSlop={8}
                style={{ position: 'absolute', top: 8, right: 8, backgroundColor: tk.overlay, borderRadius: 16, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} color={tk.onPrimary} strokeWidth={2.5} />
              </AppPressable>
              {!features.dish_analysis ? (
                <Text style={{ color: tk.textMuted, fontSize: fontSize.xs, padding: spacing.md }}>{t('ai.unavailable')}</Text>
              ) : dishTask.state.status === 'idle' && !analysis ? (
                <View style={{ padding: spacing.md }}>
                  <AppButton label={t('createItem.analyzeWithAI')} onPress={() => void dishTask.run(photoUri)} />
                </View>
              ) : null}
            </View>
          ) : (
            <ListRow
              icon={<Camera size={20} color={tk.link} strokeWidth={1.75} />}
              iconBg={tk.primaryTint}
              title={t('createItem.addDishPhoto')}
              titleAccessory={
                <View style={{ backgroundColor: tk.primaryTint, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 }}>
                  <Text style={{ color: tk.onPrimaryTint, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }}>{t('ai.badge')}</Text>
                </View>
              }
              subtitle={features.dish_analysis ? t('createItem.aiWillSuggest') : t('createItem.photoOnly')}
              onPress={showPhotoPicker}
              separator={false}
            />
          )}
        </View>

        <AiStatusPanel
          state={dishTask.state}
          onCancel={dishTask.cancel}
          onRetry={dishTask.retry}
          onManual={dishTask.reset}
          manualLabel={t('ai.enterManually')}
        />

        {/* AI suggestions — the chef accepts, edits or removes each one */}
        {analysis && (drafts.length > 0 || analysis.price) ? (
          <View style={{ backgroundColor: tk.primaryTint, borderRadius: radius.xl, padding: spacing.md, gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Sparkles size={14} color={tk.onPrimaryTint} strokeWidth={2} />
              <Text style={{ color: tk.onPrimaryTint, fontWeight: '700', fontSize: fontSize.sm, flex: 1 }}>{t('createItem.aiSuggestions')}</Text>
            </View>
            <Text style={{ color: tk.onPrimaryTint, fontSize: fontSize.xs, fontWeight: '600' }}>{t('ai.estimateWarning')}</Text>

            {analysis.price ? (
              <View style={{ gap: 6 }}>
                <Text style={{ color: tk.text, fontSize: fontSize.sm }}>
                  {t('createItem.priceRange', {
                    low: formatRWF(analysis.price.low, i18n.language),
                    high: formatRWF(analysis.price.high, i18n.language),
                  })}
                </Text>
                <Text style={{ color: tk.textMuted, fontSize: fontSize.xs }}>
                  {t('createItem.priceReasoning', {
                    cost: formatRWF(analysis.price.cost_per_portion, i18n.language),
                    low: analysis.price.food_cost_low_pct,
                    high: analysis.price.food_cost_high_pct,
                    costed: analysis.price.costed_ingredients,
                    total: analysis.price.total_ingredients,
                  })}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[analysis.price.low, analysis.price.high].map((p) => (
                    <SelectableChip
                      key={p}
                      label={formatRWF(p, i18n.language)}
                      selected={sellingPriceValue === String(p)}
                      onPress={() => setValue('selling_price', String(p), { shouldValidate: true })}
                      accessibilityLabel={t('createItem.usePrice', { price: formatRWF(p, i18n.language) })}
                    />
                  ))}
                </View>
              </View>
            ) : analysis.price_unavailable_reason ? (
              <Text style={{ color: tk.textMuted, fontSize: fontSize.xs }}>{t(`createItem.priceUnavailable.${analysis.price_unavailable_reason}`)}</Text>
            ) : null}

            {drafts.length > 0 ? (
              <Text style={[sectionLabel, { marginTop: 4 }]}>{t('createItem.detectedIngredients')}</Text>
            ) : null}
            {drafts.map((d) => (
              <View
                key={d.key}
                style={{ backgroundColor: tk.surfaceRaised, borderRadius: radius.md, padding: spacing.sm + 2, gap: 6, opacity: d.accepted ? 1 : 0.6 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <AppPressable
                    onPress={() => updateDraft(d.key, { accepted: !d.accepted })}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: d.accepted }}
                    accessibilityLabel={t('createItem.acceptIngredient', { name: d.name })}
                    hitSlop={8}
                    style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: tk.primary, backgroundColor: d.accepted ? tk.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}
                  >
                    {d.accepted ? <Check size={14} color={tk.onPrimary} strokeWidth={3} /> : null}
                  </AppPressable>
                  <Text style={{ color: tk.text, fontSize: fontSize.sm, fontWeight: '600', flex: 1 }}>{d.name}</Text>
                  <Text style={{ color: d.ingredientId ? tk.link : tk.textMuted, fontSize: fontSize.xs, fontWeight: '600' }}>
                    {d.ingredientId ? t('createItem.inStock') : t('createItem.newIngredient')}
                  </Text>
                  <AppPressable
                    onPress={() => setDrafts((prev) => prev.filter((x) => x.key !== d.key))}
                    accessibilityRole="button"
                    accessibilityLabel={t('createItem.removeIngredient', { name: d.name })}
                    hitSlop={8}
                  >
                    <X size={16} color={tk.textMuted} strokeWidth={2} />
                  </AppPressable>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ThemedTextInput
                    value={d.qty}
                    onChangeText={(v) => updateDraft(d.key, { qty: v.replace(',', '.') })}
                    keyboardType="decimal-pad"
                    accessibilityLabel={t('createItem.qtyPerPortionLabel', { name: d.name })}
                    style={{ flex: 1, backgroundColor: tk.surfaceSunken, color: tk.text, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 6, fontSize: fontSize.sm }}
                  />
                  <Text style={{ color: tk.textMuted, fontSize: fontSize.sm }}>{t('createItem.unitPerPortion', { unit: d.unit })}</Text>
                </View>
                {!d.ingredientId && d.accepted ? (
                  <AppPressable
                    onPress={() => void createDraftInStock(d)}
                    disabled={d.creating}
                    accessibilityRole="button"
                    accessibilityLabel={t('createItem.createInStockLabel', { name: d.name })}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4, opacity: d.creating ? 0.4 : 1 }}
                  >
                    <PackagePlus size={14} color={tk.link} strokeWidth={2} />
                    <Text style={{ color: tk.link, fontSize: fontSize.xs, fontWeight: '700' }}>{t('createItem.createInStock')}</Text>
                  </AppPressable>
                ) : null}
              </View>
            ))}
            {unmatchedCount > 0 ? (
              <Text style={{ color: tk.textMuted, fontSize: fontSize.xs }}>{t('createItem.unmatchedNote', { count: unmatchedCount })}</Text>
            ) : null}
          </View>
        ) : null}

        <Text style={{ color: tk.textMuted, fontSize: fontSize.sm }}>{t('createItem.helpText')}</Text>

        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <View>
              <AppTextField
                label={t('createItem.itemNameLabel')}
                placeholder={t('createItem.itemNamePlaceholder')}
                value={value}
                onChangeText={onChange}
                onBlur={() => {
                  onBlur();
                  setTimeout(() => setNameFocused(false), 150);
                }}
                error={errors.name?.message}
                autoFocus={!params.photoUri}
                autoCapitalize="words"
                inputProps={{ onFocus: () => setNameFocused(true) }}
              />
              {showSuggestions && (
                <View style={{ backgroundColor: tk.surfaceRaised, borderWidth: 1, borderColor: tk.border, borderRadius: radius.md, marginTop: 4, overflow: 'hidden' }}>
                  {suggestions.map((s, i) => (
                    <ListRow
                      key={s}
                      icon={<Plus size={16} color={tk.link} strokeWidth={2.5} />}
                      iconBg={tk.primaryTint}
                      title={s}
                      chevron={false}
                      separator={i < suggestions.length - 1}
                      onPress={() => {
                        setValue('name', s, { shouldValidate: true });
                        setNameFocused(false);
                      }}
                      accessibilityLabel={t('createItem.useSuggestion', { name: s })}
                    />
                  ))}
                </View>
              )}
            </View>
          )}
        />

        <View style={{ gap: 8 }}>
          <Text style={sectionLabel}>{t('createItem.categoryLabel')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel={t('createItem.categoryLabel')}>
            {MENU_ITEM_CATEGORIES.map((cat) => (
              <SelectableChip
                key={cat}
                label={t(`menu.categories.${cat}`)}
                selected={category === cat}
                onPress={() => setCategory(category === cat ? null : cat)}
              />
            ))}
          </View>
        </View>

        <Controller
          control={control}
          name="selling_price"
          render={({ field: { onChange, onBlur, value } }) => (
            <AppTextField
              label={t('createItem.priceLabel')}
              placeholder={t('createItem.pricePlaceholder')}
              value={value}
              onChangeText={(v) => onChange(v.replace(/[^0-9]/g, ''))}
              onBlur={onBlur}
              error={errors.selling_price?.message}
              keyboardType="number-pad"
              suffix="RWF"
            />
          )}
        />

        {priceAnomaly !== false && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: tk.warningTint, borderRadius: radius.md, padding: spacing.sm + 2 }} accessibilityRole="alert">
            <AlertTriangle size={14} color={tk.warningText} strokeWidth={2} />
            <Text style={{ color: tk.warningText, fontSize: fontSize.xs, flex: 1, lineHeight: 18 }}>
              {priceAnomaly === 'high' ? t('createItem.priceAnomalyHigh') : t('createItem.priceAnomalyLow')}
            </Text>
          </View>
        )}

        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <AppTextField
              label={t('createItem.descriptionLabel')}
              placeholder={t('createItem.descriptionPlaceholder')}
              value={value ?? ''}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.description?.message}
              multiline
              numberOfLines={2}
            />
          )}
        />

        {saveError ? (
          <Text style={{ color: tk.danger, fontSize: fontSize.sm, textAlign: 'center' }} accessibilityRole="alert">
            {saveError}
          </Text>
        ) : null}
      </FormScreen>
    </AppScreen>
  );
}
