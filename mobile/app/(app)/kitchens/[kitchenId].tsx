import { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import { AppTextField } from '@/components/ui/AppTextField';
import { AppButton } from '@/components/ui/AppButton';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { useKitchenStore } from '@/store/kitchen-store';
import { useUpdateKitchen, useArchiveKitchen } from '@/features/kitchens/useKitchens';
import { kitchenSchema, type KitchenFormValues } from '@/features/kitchens/kitchen-schema';
import { spacing, colors, fontSize } from '@/lib/theme';

export default function KitchenDetailScreen() {
  const { kitchenId } = useLocalSearchParams<{ kitchenId: string }>();
  const kitchen = useKitchenStore((s) => s.kitchens.find((k) => k.id === kitchenId));
  const updateKitchen = useUpdateKitchen();
  const archiveKitchen = useArchiveKitchen();
  const [archiveDialogVisible, setArchiveDialogVisible] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<KitchenFormValues>({
    resolver: zodResolver(kitchenSchema),
    defaultValues: {
      name: kitchen?.name ?? '',
      address: kitchen?.address ?? '',
      cuisineType: kitchen?.cuisineType ?? '',
      seatingCapacity: kitchen?.seatingCapacity?.toString() ?? '',
    },
  });

  if (!kitchen) {
    return (
      <AppScreen>
        <AppHeader title="Kitchen" showBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.surface[400] }}>Kitchen not found.</Text>
        </View>
      </AppScreen>
    );
  }

  const onSubmit = async (values: KitchenFormValues) => {
    await updateKitchen.mutateAsync({
      kitchenId: kitchen.id,
      body: {
        name: values.name,
        address: values.address || null,
        location: values.cuisineType || null,
      },
    });
    router.back();
  };

  const handleArchive = async () => {
    await archiveKitchen.mutateAsync(kitchen.id);
    setArchiveDialogVisible(false);
    router.replace('/(app)/kitchens');
  };

  return (
    <AppScreen>
      <AppHeader title="Edit Kitchen" showBack />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            padding: spacing.md,
            gap: spacing.md,
            paddingBottom: spacing['2xl'],
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppTextField
                label="Kitchen Name"
                placeholder="e.g. Kigali Bistro"
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
            name="cuisineType"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppTextField
                label="Cuisine Type (optional)"
                placeholder="e.g. Rwandan, French"
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.cuisineType?.message}
                autoCapitalize="words"
              />
            )}
          />

          <Controller
            control={control}
            name="address"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppTextField
                label="Address (optional)"
                placeholder="e.g. KG 7 Ave, Kigali"
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.address?.message}
                autoCapitalize="sentences"
              />
            )}
          />

          <Controller
            control={control}
            name="seatingCapacity"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppTextField
                label="Seating Capacity (optional)"
                placeholder="e.g. 40"
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.seatingCapacity?.message}
                keyboardType="number-pad"
              />
            )}
          />

          <AppButton
            label="Save Changes"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting || updateKitchen.isPending}
            disabled={!isDirty}
          />

          {updateKitchen.isError && (
            <Text style={{ color: colors.danger, fontSize: fontSize.sm, textAlign: 'center' }}>
              Failed to save changes. Please try again.
            </Text>
          )}

          {!kitchen.isArchived ? (
            <AppButton
              label="Archive Kitchen"
              onPress={() => setArchiveDialogVisible(true)}
              variant="danger"
            />
          ) : (
            <Text style={{ color: colors.surface[500], fontSize: fontSize.sm, textAlign: 'center' }}>
              This kitchen is archived.
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmationDialog
        visible={archiveDialogVisible}
        title="Archive Kitchen?"
        message="This kitchen will be hidden from your workspace. You can restore it later."
        confirmLabel="Archive"
        cancelLabel="Cancel"
        destructive
        onConfirm={handleArchive}
        onCancel={() => setArchiveDialogVisible(false)}
      />
    </AppScreen>
  );
}
