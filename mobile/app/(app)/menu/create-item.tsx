import { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import { AppTextField } from '@/components/ui/AppTextField';
import { AppButton } from '@/components/ui/AppButton';
import { useKitchenStore } from '@/store/kitchen-store';
import { useQueryClient } from '@tanstack/react-query';
import { useSessionStore } from '@/store/session-store';
import { queryKeys } from '@/api/query-keys';
import { listMenus, createMenu, createMenuItem } from '@/api/menus-api';
import { useMenuItems } from '@/features/menu/useMenuItems';
import { useColorScheme } from 'react-native';
import { colors, spacing, fontSize, radius } from '@/lib/theme';

const COMMON_ITEMS = [
  'Brochettes', 'Ugali', 'Chips', 'Rice', 'Beans', 'Chicken Stew', 'Fish Fry',
  'Beef Stew', 'Chapati', 'Mandazi', 'Samosa', 'Pilau', 'Matoke', 'Nyama Choma',
  'Orange Juice', 'Passion Juice', 'Avocado Juice', 'Mango Juice', 'Soda', 'Water',
  'Milk Tea', 'Black Tea', 'Coffee', 'Hot Chocolate',
];

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(80).trim(),
  selling_price: z
    .string()
    .min(1, 'Price is required')
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Enter a valid price'),
  description: z.string().max(200).trim().optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

export default function CreateMenuItemScreen() {
  const isDark = useColorScheme() === 'dark';
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  const chefId = useSessionStore((s) => s.chef?.id ?? '');
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);

  const { data: existingItems = [] } = useMenuItems();

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', selling_price: '', description: '' },
  });

  const nameValue = watch('name');

  // Suggestions: existing menu item names + common items, filtered by what's typed
  const suggestions = useMemo(() => {
    const q = nameValue.trim().toLowerCase();
    if (!q || q.length < 1) return [];
    const existingNames = existingItems.map((i) => i.name);
    const allOptions = [...new Set([...existingNames, ...COMMON_ITEMS])];
    return allOptions
      .filter((n) => n.toLowerCase().includes(q) && n.toLowerCase() !== q)
      .slice(0, 5);
  }, [nameValue, existingItems]);

  const showSuggestions = nameFocused && suggestions.length > 0;

  const onSubmit = async (values: FormValues) => {
    if (!activeKitchen) return;
    setSaving(true);
    setError(null);
    try {
      const menus = await listMenus(activeKitchen.id);
      let menuId = menus.find((m) => m.is_active)?.id;
      if (!menuId) {
        const created = await createMenu(activeKitchen.id, { name: 'Main Menu' });
        menuId = created.id;
      }

      await createMenuItem(activeKitchen.id, menuId, {
        name: values.name,
        selling_price: values.selling_price,
        description: values.description || null,
      });

      void qc.invalidateQueries({ queryKey: queryKeys.menu.items(chefId, activeKitchen.id) });
      router.back();
    } catch {
      setError('Could not save item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const cardBg = isDark ? colors.surface[800] : colors.white;
  const textPrimary = isDark ? colors.white : colors.surface[900];
  const textSecondary = isDark ? colors.surface[400] : colors.surface[600];
  const borderColor = isDark ? colors.surface[700] : colors.surface[200];

  return (
    <AppScreen>
      <AppHeader title="New Menu Item" showBack />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: spacing['2xl'] }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ color: isDark ? colors.surface[400] : colors.surface[600], fontSize: fontSize.sm }}>
            Add a dish or drink to your menu. Activate or deactivate items from the Menu tab.
          </Text>

          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <View>
                <AppTextField
                  label="Item Name"
                  placeholder="e.g. Brochettes, Ugali, Orange Juice"
                  value={value}
                  onChangeText={onChange}
                  onBlur={() => {
                    onBlur();
                    setTimeout(() => setNameFocused(false), 150);
                  }}
                  error={errors.name?.message}
                  autoFocus
                  autoCapitalize="words"
                  inputProps={{ onFocus: () => setNameFocused(true) }}
                />
                {showSuggestions && (
                  <View
                    style={{
                      backgroundColor: cardBg,
                      borderWidth: 1,
                      borderColor,
                      borderRadius: radius.md,
                      marginTop: 4,
                      overflow: 'hidden',
                    }}
                  >
                    {suggestions.map((s, i) => (
                      <Pressable
                        key={s}
                        onPress={() => {
                          setValue('name', s, { shouldValidate: true });
                          setNameFocused(false);
                        }}
                        style={({ pressed }) => ({
                          paddingHorizontal: spacing.md,
                          paddingVertical: spacing.sm + 2,
                          backgroundColor: pressed ? (isDark ? colors.surface[700] : colors.surface[100]) : 'transparent',
                          borderTopWidth: i > 0 ? 1 : 0,
                          borderTopColor: borderColor,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: spacing.sm,
                        })}
                      >
                        <Text style={{ color: '#0E8438', fontSize: fontSize.sm }}>+</Text>
                        <Text style={{ color: textPrimary, fontSize: fontSize.sm, flex: 1 }}>{s}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            )}
          />

          <Controller
            control={control}
            name="selling_price"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppTextField
                label="Selling Price (RWF)"
                placeholder="e.g. 3500"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.selling_price?.message}
                keyboardType="decimal-pad"
              />
            )}
          />

          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppTextField
                label="Description (optional)"
                placeholder="e.g. Grilled beef skewers with peppers"
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.description?.message}
                multiline
                numberOfLines={2}
              />
            )}
          />

          <View style={{ marginTop: spacing.sm }}>
            <AppButton
              label="Save Menu Item"
              onPress={handleSubmit(onSubmit)}
              loading={saving}
            />
          </View>

          {error && (
            <Text style={{ color: colors.danger, fontSize: fontSize.sm, textAlign: 'center' }}>
              {error}
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}
