import { useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  Pressable,
  Image,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ChefHat, ChevronLeft, MapPin, Users, UtensilsCrossed } from 'lucide-react-native';
import { AppTextField } from '@/components/ui/AppTextField';
import { AppButton } from '@/components/ui/AppButton';
import { FormScreen } from '@/components/ui/FormScreen';
import { StickyFooter } from '@/components/ui/StickyFooter';
import { useCreateKitchen } from '@/features/kitchens/useKitchens';
import { kitchenSchema, type KitchenFormValues } from '@/features/kitchens/kitchen-schema';
import { useColorScheme } from 'react-native';
import { spacing, colors, fontSize, radius } from '@/lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

export default function CreateKitchenScreen() {
  const isDark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const createKitchen = useCreateKitchen();
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const bg = isDark ? colors.surface[950] : colors.surface[50];
  const cardBg = isDark ? colors.surface[800] : colors.white;
  const borderColor = isDark ? colors.surface[700] : colors.surface[200];

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<KitchenFormValues>({
    resolver: zodResolver(kitchenSchema),
    defaultValues: { name: '', address: '', cuisineType: '', seatingCapacity: '' },
  });

  const pickPhoto = async (fromCamera: boolean) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') { Alert.alert('Permission needed', 'Allow access to continue.'); return; }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  };

  const showPhotoPicker = () => Alert.alert('Kitchen Photo', 'Choose a source', [
    { text: 'Camera', onPress: () => pickPhoto(true) },
    { text: 'Gallery', onPress: () => pickPhoto(false) },
    { text: 'Cancel', style: 'cancel' },
  ]);

  const onSubmit = async (values: KitchenFormValues) => {
    await createKitchen.mutateAsync({ name: values.name, address: values.address || null, location: values.cuisineType || null });
    router.replace('/(app)/(tabs)');
  };

  const isPending = isSubmitting || createKitchen.isPending;

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <FormScreen>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 16 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollIndicatorInsets={{ right: 1 }}
        >
          {/* Hero header with gradient */}
          <View style={{ height: 220, position: 'relative', overflow: 'hidden' }}>
            <Svg style={StyleSheet.absoluteFill} width="100%" height="220">
              <Defs>
                <LinearGradient id="heroGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#0E8438" stopOpacity="1" />
                  <Stop offset="1" stopColor="#064E3B" stopOpacity="1" />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="220" fill="url(#heroGrad)" />
            </Svg>
            {/* Back button */}
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              style={{ position: 'absolute', top: insets.top + 8, left: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' }}
            >
              <ChevronLeft size={22} color={colors.white} strokeWidth={2} />
            </Pressable>
            <View style={{ position: 'absolute', top: insets.top + 48, left: 0, right: 0, alignItems: 'center', gap: 8 }}>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase' }}>Food Bundles Chef</Text>
              <Text style={{ color: colors.white, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>Create Your Kitchen</Text>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'center', paddingHorizontal: 32 }}>Your kitchen workspace for managing stock, menus, and deliveries.</Text>
            </View>
            {/* Photo circle at bottom of hero */}
            <View style={{ position: 'absolute', bottom: -36, left: 0, right: 0, alignItems: 'center' }}>
              <Pressable
                onPress={showPhotoPicker}
                accessibilityRole="button"
                accessibilityLabel="Add kitchen photo"
                style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: isDark ? colors.surface[800] : colors.white, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 3, borderColor: colors.white, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 }}
              >
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={{ width: 80, height: 80 }} />
                ) : (
                  <View style={{ alignItems: 'center', gap: 4 }}>
                    <Camera size={24} color={colors.brand[500]} strokeWidth={1.75} />
                    <Text style={{ color: colors.brand[500], fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Photo</Text>
                  </View>
                )}
              </Pressable>
            </View>
          </View>

          {/* Form card */}
          <View style={{ marginTop: 52, paddingHorizontal: spacing.md, gap: spacing.md }}>
            {/* Kitchen Name */}
            <View style={[styles.fieldGroup, { backgroundColor: cardBg, borderColor }]}>
              <View style={styles.fieldIcon}>
                <ChefHat size={16} color={colors.brand[500]} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Controller
                  control={control}
                  name="name"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <AppTextField
                      label="Kitchen Name *"
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
              </View>
            </View>

            {/* Cuisine Type */}
            <View style={[styles.fieldGroup, { backgroundColor: cardBg, borderColor }]}>
              <View style={styles.fieldIcon}>
                <UtensilsCrossed size={16} color={colors.brand[500]} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Controller
                  control={control}
                  name="cuisineType"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <AppTextField
                      label="City / Location *"
                      placeholder="e.g. Kigali, Musanze, Butare"
                      value={value ?? ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.cuisineType?.message}
                      autoCapitalize="words"
                    />
                  )}
                />
              </View>
            </View>

            {/* Address */}
            <View style={[styles.fieldGroup, { backgroundColor: cardBg, borderColor }]}>
              <View style={styles.fieldIcon}>
                <MapPin size={16} color={colors.brand[500]} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
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
              </View>
            </View>

            {/* Capacity */}
            <View style={[styles.fieldGroup, { backgroundColor: cardBg, borderColor }]}>
              <View style={styles.fieldIcon}>
                <Users size={16} color={colors.brand[500]} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
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
              </View>
            </View>

            {createKitchen.isError && (
              <Text style={{ color: colors.danger, fontSize: fontSize.sm, textAlign: 'center' }}>
                Failed to create kitchen. Please try again.
              </Text>
            )}

            <View style={{ height: 8 }} />
          </View>
        </ScrollView>

        <StickyFooter>
          <AppButton
            label="Create Kitchen"
            onPress={() => void handleSubmit(onSubmit)()}
            loading={isPending}
            disabled={isPending}
            size="lg"
          />
        </StickyFooter>
      </FormScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  fieldIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
});
