import { useState, useEffect } from 'react';
import { Alert, Text, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FormScreen } from '@/components/ui/FormScreen';
import { useCreateKitchen } from '@/features/kitchens/useKitchens';
import { kitchenSchema, type KitchenFormValues } from '@/features/kitchens/kitchen-schema';
import { DEFAULT_CLOSING_TIME, DEFAULT_OPENING_TIME } from '@/store/kitchen-store';
import { KitchenFormFields } from '@/features/kitchens/KitchenFormFields';
import { useTheme } from '@/providers/ThemeProvider';
import { deviceRegionDefaults } from '@/lib/regions';
import { loadOnboardingState, saveOnboardingState } from '@/store/onboarding-store';
import { useSessionStore } from '@/store/session-store';
import { colors, authPalette } from '@/lib/theme';

export default function OnboardingKitchenScreen() {
  const { t } = useTranslation();
  const tk = useTheme();
  const insets = useSafeAreaInsets();
  const chef = useSessionStore((s) => s.chef);
  const createKitchen = useCreateKitchen();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [region] = useState(deviceRegionDefaults);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<KitchenFormValues>({
    resolver: zodResolver(kitchenSchema),
    defaultValues: {
      name: '',
      address: '',
      cuisineType: '',
      seatingCapacity: '',
      country: region.country ?? '',
      currency: region.currency ?? '',
      timezone: region.timezone ?? '',
      openingTime: DEFAULT_OPENING_TIME,
      closingTime: DEFAULT_CLOSING_TIME,
    },
  });

  const pickPhoto = async (fromCamera: boolean) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert(t('kitchens.photoPermissionTitle'), t('kitchens.photoPermissionBody'));
      return;
    }
    const options: ImagePicker.ImagePickerOptions = {
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    };
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
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
      await createKitchen.mutateAsync({
        name: values.name,
        address: values.address || null,
        location: values.cuisineType || null,
        country: values.country,
        currency: values.currency,
        timezone: values.timezone,
        opening_time: values.openingTime,
        closing_time: values.closingTime,
      });

      // Mark kitchen step complete
      if (chef?.id) {
        const state = await loadOnboardingState(chef.id);
        await saveOnboardingState(chef.id, { ...state, kitchenComplete: true });
      }

      router.push('/(onboarding)/language');
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
          label: t('common.continue'),
          onPress: () => void handleSubmit(onSubmit)(),
          loading: isPending,
        },
      ]}
    >
      {/* Progress indicator */}
      <View style={styles.progress}>
        <View style={[styles.progressDot, styles.progressDotActive]} />
        <View style={[styles.progressDot, styles.progressDotActive]} />
        <View style={styles.progressDot} />
      </View>

      <KitchenFormFields
        control={control}
        errors={errors}
        eyebrow={t('onboarding.stepKitchen')}
        title={t('onboarding.kitchenTitle')}
        subtitle={t('onboarding.kitchenSubtitle')}
        photoUri={photoUri}
        onPickPhoto={showPhotoPicker}
        photoLabel={t('kitchens.photoLabel')}
        setValue={setValue}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  progress: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 24,
    marginBottom: 32,
    marginTop: 16,
  },
  progressDot: {
    width: 32,
    height: 4,
    backgroundColor: authPalette.card,
    borderRadius: 2,
  },
  progressDotActive: {
    backgroundColor: colors.action,
  },
});
