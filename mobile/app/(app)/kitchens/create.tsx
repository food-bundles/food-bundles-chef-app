import { useState } from 'react';
import { Alert, Text } from 'react-native';
import { router } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FormScreen } from '@/components/ui/FormScreen';
import { useCreateKitchen } from '@/features/kitchens/useKitchens';
import { kitchenSchema, type KitchenFormValues } from '@/features/kitchens/kitchen-schema';
import { KitchenFormFields } from '@/features/kitchens/KitchenFormFields';
import { useTheme } from '@/providers/ThemeProvider';
import { fontSize } from '@/lib/theme';

export default function CreateKitchenScreen() {
  const { t } = useTranslation();
  const tk = useTheme();
  const insets = useSafeAreaInsets();
  const createKitchen = useCreateKitchen();
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<KitchenFormValues>({
    resolver: zodResolver(kitchenSchema),
    defaultValues: { name: '', address: '', cuisineType: '', seatingCapacity: '' },
  });

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
      await createKitchen.mutateAsync({ name: values.name, address: values.address || null, location: values.cuisineType || null });
      router.replace('/(app)/(tabs)');
    } catch {
      // createKitchen.isError renders the inline message below the fields
    }
  };

  const isPending = isSubmitting || createKitchen.isPending;

  return (
    <FormScreen
      contentContainerStyle={{ padding: 0, gap: 0, paddingBottom: 24 }}
      keyboardBarTopInset={insets.top}
      actions={[
        {
          kind: 'create',
          label: t('kitchens.createButton'),
          onPress: () => void handleSubmit(onSubmit)(),
          loading: isPending,
        },
      ]}
    >
      <KitchenFormFields
        control={control}
        errors={errors}
        eyebrow={t('common.appName')}
        title={t('kitchens.createYourKitchen')}
        subtitle={t('kitchens.createHeroSub')}
        photoUri={photoUri}
        onPickPhoto={showPhotoPicker}
        photoLabel={t('kitchens.addPhotoLabel')}
        autoFocusName
      >
        {createKitchen.isError ? (
          <Text style={{ color: tk.danger, fontSize: fontSize.sm, textAlign: 'center' }} accessibilityRole="alert">
            {t('kitchens.createError')}
          </Text>
        ) : null}
      </KitchenFormFields>
    </FormScreen>
  );
}
