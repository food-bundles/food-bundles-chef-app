import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Text,
} from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import { AppTextField } from '@/components/ui/AppTextField';
import { AppButton } from '@/components/ui/AppButton';
import { useCreateKitchen } from '@/features/kitchens/useKitchens';
import { kitchenSchema, type KitchenFormValues } from '@/features/kitchens/kitchen-schema';
import { spacing, colors, fontSize } from '@/lib/theme';

export default function CreateKitchenScreen() {
  const createKitchen = useCreateKitchen();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<KitchenFormValues>({
    resolver: zodResolver(kitchenSchema),
    defaultValues: {
      name: '',
      address: '',
      cuisineType: '',
      seatingCapacity: '',
    },
  });

  const onSubmit = async (values: KitchenFormValues) => {
    await createKitchen.mutateAsync({
      name: values.name,
      address: values.address || null,
      location: values.cuisineType || null,
    });
    router.back();
  };

  return (
    <AppScreen>
      <AppHeader title="New Kitchen" showBack />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={{
            padding: spacing.md,
            gap: spacing.md,
            paddingBottom: spacing['2xl'],
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ color: colors.surface[400], fontSize: fontSize.sm }}>
            Set up your kitchen workspace. You can update these details later.
          </Text>

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
                autoFocus
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
                placeholder="e.g. Rwandan, French, Pan-African"
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
            label="Create Kitchen"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting || createKitchen.isPending}
          />

          {createKitchen.isError && (
            <Text style={{ color: colors.danger, fontSize: fontSize.sm, textAlign: 'center' }}>
              Failed to create kitchen. Please try again.
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}
