import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
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
import { updateMenuItem } from '@/api/menus-api';
import { useColorScheme } from 'react-native';
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

export default function EditMenuItemScreen() {
  const isDark = useColorScheme() === 'dark';
  const params = useLocalSearchParams<{
    itemId: string;
    menuId: string;
    name: string;
    selling_price: string;
    description: string;
  }>();

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
    defaultValues: {
      name: params.name ?? '',
      selling_price: params.selling_price ?? '',
      description: params.description ?? '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!activeKitchen || !params.menuId || !params.itemId) return;
    setSaving(true);
    setError(null);
    try {
      await updateMenuItem(activeKitchen.id, params.menuId, params.itemId, {
        name: values.name,
        selling_price: values.selling_price,
        description: values.description || null,
      });
      void qc.invalidateQueries({ queryKey: queryKeys.menu.items(chefId, activeKitchen.id) });
      router.back();
    } catch {
      setError('Could not update item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen>
      <AppHeader title="Edit Menu Item" showBack />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: spacing['2xl'] }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ color: isDark ? colors.surface[400] : colors.surface[600], fontSize: fontSize.sm }}>
            Update the name, price or description of this menu item.
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

          <View style={{ marginTop: spacing.sm }}>
            <AppButton
              label="Save Changes"
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
