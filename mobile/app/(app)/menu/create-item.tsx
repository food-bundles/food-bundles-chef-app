import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
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
import { colors, spacing, fontSize } from '@/lib/theme';

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
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  const chefId = useSessionStore((s) => s.chef?.id ?? '');
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', selling_price: '', description: '' },
  });

  const onSubmit = async (values: FormValues) => {
    if (!activeKitchen) return;
    setSaving(true);
    setError(null);
    try {
      // Ensure at least one active menu exists
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

  return (
    <AppScreen>
      <AppHeader title="New Menu Item" showBack />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: spacing['2xl'] }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ color: colors.surface[400], fontSize: fontSize.sm }}>
            Add a dish or drink to your menu. Activate or deactivate items from the Menu tab.
          </Text>

          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppTextField
                label="Item Name"
                placeholder="e.g. Brochettes, Ugali, Orange Juice"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.name?.message}
                autoFocus
                autoCapitalize="words"
              />
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

          <AppButton
            label="Add to Menu"
            onPress={handleSubmit(onSubmit)}
            loading={saving}
          />

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
