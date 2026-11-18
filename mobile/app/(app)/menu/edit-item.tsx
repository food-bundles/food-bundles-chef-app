import { useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import { AppTextField } from '@/components/ui/AppTextField';
import { FormScreen } from '@/components/ui/FormScreen';
import { SelectableChip } from '@/components/ui/SelectableChip';
import { useKitchenStore } from '@/store/kitchen-store';
import { useSessionStore } from '@/store/session-store';
import { queryKeys } from '@/api/query-keys';
import { deleteMenuItem, updateMenuItem, MENU_ITEM_CATEGORIES, type MenuItemCategory } from '@/api/menus-api';
import { useTheme } from '@/providers/ThemeProvider';
import { fontSize, fontWeight } from '@/lib/theme';

function toCategory(value: string | undefined): MenuItemCategory | null {
  return MENU_ITEM_CATEGORIES.find((c) => c === value) ?? null;
}

export default function EditMenuItemScreen() {
  const { t } = useTranslation();
  const tk = useTheme();
  const params = useLocalSearchParams<{
    itemId: string;
    menuId: string;
    name: string;
    selling_price: string;
    description: string;
    category?: string;
  }>();

  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  const chefId = useSessionStore((s) => s.chef?.id ?? '');
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [category, setCategory] = useState<MenuItemCategory | null>(toCategory(params.category));

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

  const { control, handleSubmit, formState: { errors, isValid } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      name: params.name ?? '',
      selling_price: params.selling_price ? String(Math.round(parseFloat(params.selling_price))) : '',
      description: params.description ?? '',
    },
  });

  const invalidate = () => {
    if (!activeKitchen) return;
    void qc.invalidateQueries({ queryKey: queryKeys.menu.items(chefId, activeKitchen.id) });
  };

  const onSubmit = async (values: FormValues) => {
    if (!activeKitchen || !params.menuId || !params.itemId) return;
    setSaving(true);
    setError(null);
    try {
      await updateMenuItem(activeKitchen.id, params.menuId, params.itemId, {
        name: values.name,
        selling_price: values.selling_price,
        description: values.description || null,
        category,
      });
      invalidate();
      router.back();
    } catch {
      setError(t('editItem.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const onRemove = async () => {
    if (!activeKitchen || !params.menuId || !params.itemId) return;
    setRemoving(true);
    setError(null);
    try {
      await deleteMenuItem(activeKitchen.id, params.menuId, params.itemId);
      invalidate();
      router.dismissTo('/(app)/(tabs)/menu');
    } catch {
      setError(t('editItem.removeError'));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <AppScreen>
      <AppHeader title={t('editItem.title')} showBack />
      <FormScreen
        actions={[
          {
            kind: 'update',
            label: t('editItem.saveButton'),
            onPress: () => void handleSubmit(onSubmit)(),
            loading: saving,
            disabled: !isValid || removing,
          },
          {
            kind: 'remove',
            label: t('editItem.removeButton'),
            onPress: () => void onRemove(),
            loading: removing,
            disabled: saving,
            confirm: {
              title: t('editItem.removeConfirmTitle'),
              message: t('editItem.removeConfirmMessage', { name: params.name ?? '' }),
              confirmLabel: t('editItem.removeButton'),
              cancelLabel: t('common.cancel'),
            },
          },
        ]}
      >
        <Text style={{ color: tk.textMuted, fontSize: fontSize.sm }}>{t('editItem.helpText')}</Text>

        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <AppTextField
              label={t('createItem.itemNameLabel')}
              placeholder={t('createItem.itemNamePlaceholder')}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.name?.message}
              autoCapitalize="words"
            />
          )}
        />

        <View style={{ gap: 8 }}>
          <Text style={{ color: tk.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            {t('createItem.categoryLabel')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup">
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

        {error ? (
          <Text style={{ color: tk.danger, fontSize: fontSize.sm, textAlign: 'center' }} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
      </FormScreen>
    </AppScreen>
  );
}
