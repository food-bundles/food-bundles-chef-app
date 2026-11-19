import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FormScreen } from '@/components/ui/FormScreen';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import { useKitchenStore } from '@/store/kitchen-store';
import { useUpdateKitchen, useArchiveKitchen } from '@/features/kitchens/useKitchens';
import { kitchenSchema, type KitchenFormValues } from '@/features/kitchens/kitchen-schema';
import { KitchenFormFields } from '@/features/kitchens/KitchenFormFields';
import { useTheme } from '@/providers/ThemeProvider';
import { fontSize, radius, spacing } from '@/lib/theme';
import type { FormAction } from '@/components/ui/FormActionButton';

export default function KitchenDetailScreen() {
  const { t } = useTranslation();
  const tk = useTheme();
  const insets = useSafeAreaInsets();
  const { kitchenId } = useLocalSearchParams<{ kitchenId: string }>();
  const kitchen = useKitchenStore((s) => s.kitchens.find((k) => k.id === kitchenId));
  const updateKitchen = useUpdateKitchen();
  const archiveKitchen = useArchiveKitchen();
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const { control, handleSubmit, setValue, formState: { errors, isSubmitting, isDirty } } = useForm<KitchenFormValues>({
    resolver: zodResolver(kitchenSchema),
    defaultValues: {
      name: kitchen?.name ?? '',
      address: kitchen?.address ?? '',
      cuisineType: kitchen?.cuisineType ?? '',
      seatingCapacity: kitchen?.seatingCapacity?.toString() ?? '',
      country: kitchen?.country ?? '',
      currency: kitchen?.currency ?? '',
      timezone: kitchen?.timezone ?? '',
    },
  });

  if (!kitchen) {
    return (
      <AppScreen>
        <AppHeader title={t('kitchens.title')} showBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: tk.surface }}>
          <Text style={{ color: tk.textMuted }}>{t('kitchens.notFound')}</Text>
        </View>
      </AppScreen>
    );
  }

  const pickPhoto = async (fromCamera: boolean) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert(t('kitchens.photoPermissionTitle'), t('kitchens.photoPermissionBody'));
      return;
    }
    const options: ImagePicker.ImagePickerOptions = { allowsEditing: true, aspect: [1, 1], quality: 0.8 };
    const result = fromCamera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    const asset = result.canceled ? undefined : result.assets[0];
    if (asset) setPhotoUri(asset.uri);
  };

  const showPhotoPicker = () =>
    Alert.alert(t('kitchens.photoTitle'), t('kitchens.photoSource'), [
      { text: t('common.camera'), onPress: () => void pickPhoto(true) },
      { text: t('common.gallery'), onPress: () => void pickPhoto(false) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);

  const onSubmit = async (values: KitchenFormValues) => {
    try {
      await updateKitchen.mutateAsync({
        kitchenId: kitchen.id,
        body: {
          name: values.name,
          address: values.address || null,
          location: values.cuisineType || null,
          country: values.country,
          timezone: values.timezone,
        },
      });
      router.back();
    } catch {
      // updateKitchen.isError renders the inline message
    }
  };

  const handleArchive = async () => {
    try {
      await archiveKitchen.mutateAsync(kitchen.id);
      router.replace('/(app)/kitchens');
    } catch {
      // archiveKitchen.isError renders the inline message
    }
  };

  const isPending = isSubmitting || updateKitchen.isPending;
  const actions: FormAction[] = [
    {
      kind: 'update',
      label: isPending ? t('kitchens.saving') : t('kitchens.saveButton'),
      onPress: () => void handleSubmit(onSubmit)(),
      loading: isPending,
      disabled: !isDirty || archiveKitchen.isPending,
    },
  ];
  if (!kitchen.isArchived) {
    actions.push({
      kind: 'remove',
      label: t('kitchens.archiveKitchen'),
      onPress: () => void handleArchive(),
      loading: archiveKitchen.isPending,
      disabled: isPending,
      confirm: {
        title: t('kitchens.archiveDialogTitle'),
        message: t('kitchens.archiveDialogMessage'),
        confirmLabel: t('kitchens.archiveConfirm'),
        cancelLabel: t('common.cancel'),
      },
    });
  }

  return (
    <FormScreen
      contentContainerStyle={{ padding: 0, gap: 0, paddingBottom: 24 }}
      keyboardBarTopInset={insets.top}
      actions={actions}
      footerNote={
        !isDirty ? (
          <Text style={{ color: tk.textMuted, fontSize: fontSize.xs, textAlign: 'center' }}>{t('kitchens.noChanges')}</Text>
        ) : null
      }
    >
      <KitchenFormFields
        control={control}
        errors={errors}
        eyebrow={t('kitchens.detailsEyebrow')}
        title={kitchen.name}
        subtitle={[kitchen.cuisineType, kitchen.address].filter(Boolean).join(' · ') || undefined}
        photoUri={photoUri}
        onPickPhoto={showPhotoPicker}
        photoLabel={t('kitchens.changePhotoLabel')}
        setValue={setValue}
        currencyLocked
      >
        {kitchen.isArchived ? (
          <View style={{ paddingVertical: spacing.sm, borderRadius: radius.lg, backgroundColor: tk.surfaceSunken, alignItems: 'center' }}>
            <Text style={{ color: tk.textMuted, fontSize: fontSize.sm }}>{t('kitchens.isArchived')}</Text>
          </View>
        ) : null}
        {updateKitchen.isError || archiveKitchen.isError ? (
          <Text style={{ color: tk.danger, fontSize: fontSize.sm, textAlign: 'center' }} accessibilityRole="alert">
            {archiveKitchen.isError ? t('kitchens.archiveError') : t('kitchens.saveError')}
          </Text>
        ) : null}
      </KitchenFormFields>
    </FormScreen>
  );
}
