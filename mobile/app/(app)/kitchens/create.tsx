import { useState } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Text,
  Pressable,
  Image,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import { AppTextField } from '@/components/ui/AppTextField';
import { AppButton } from '@/components/ui/AppButton';
import { useCreateKitchen } from '@/features/kitchens/useKitchens';
import { kitchenSchema, type KitchenFormValues } from '@/features/kitchens/kitchen-schema';
import { useColorScheme } from 'react-native';
import { spacing, colors, fontSize, radius } from '@/lib/theme';

export default function CreateKitchenScreen() {
  const isDark = useColorScheme() === 'dark';
  const createKitchen = useCreateKitchen();
  const [photoUri, setPhotoUri] = useState<string | null>(null);

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

  const pickPhoto = async (fromCamera: boolean) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to continue.');
      return;
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const showPhotoPicker = () => {
    Alert.alert('Kitchen Photo', 'Choose a source', [
      { text: 'Camera', onPress: () => pickPhoto(true) },
      { text: 'Gallery', onPress: () => pickPhoto(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const onSubmit = async (values: KitchenFormValues) => {
    await createKitchen.mutateAsync({
      name: values.name,
      address: values.address || null,
      location: values.cuisineType || null,
    });
    router.replace('/(app)/(tabs)');
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
          <Text style={{ color: isDark ? colors.surface[400] : colors.surface[600], fontSize: fontSize.sm }}>
            Set up your kitchen workspace. You can update these details later.
          </Text>

          {/* Photo picker */}
          <Pressable
            onPress={showPhotoPicker}
            style={{
              alignSelf: 'center',
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: isDark ? colors.surface[800] : colors.surface[200],
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              borderWidth: 2,
              borderColor: colors.brand[500],
              borderStyle: 'dashed',
            }}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={{ width: 96, height: 96 }} />
            ) : (
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Camera size={28} color={colors.brand[500]} strokeWidth={1.5} />
                <Text style={{ color: colors.brand[500], fontSize: 10 }}>Add Photo</Text>
              </View>
            )}
          </Pressable>

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

          <View style={{ marginTop: spacing.sm }}>
            <AppButton
              label="Create Kitchen"
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting || createKitchen.isPending}
            />
          </View>

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
