import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { AppPressable } from '@/components/ui/AppPressable';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, Image as ImageIcon, Building2, Check, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { updateProfile } from '@/api/auth-api';
import { ApiError } from '@/api/errors';
import { useSessionStore } from '@/store/session-store';
import { authPalette, colors } from '@/lib/theme';
import { validateProfileData } from '@/domain/rules/onboarding';
import { loadOnboardingState, saveOnboardingState } from '@/store/onboarding-store';
import {
  lookupUserByEmail,
  isRestaurantUser,
  toRestaurantData,
  type RestaurantLookupResult,
} from '@/api/foodbundles-api';

export default function OnboardingProfileScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const chef = useSessionStore((s) => s.chef);
  const updateChef = useSessionStore((s) => s.updateChef);
  const [name, setName] = useState(chef?.name ?? '');
  const [email, setEmail] = useState('');
  const [tin, setTin] = useState('');
  const [restaurantEmail, setRestaurantEmail] = useState('');
  const [restaurant, setRestaurant] = useState<RestaurantLookupResult | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validation = validateProfileData({ name: name.trim() || null });
  const isValid = validation.valid;

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

  const handleRestaurantLookup = async () => {
    if (!restaurantEmail.trim()) return;
    setLookupError(null);
    setLookupLoading(true);
    try {
      const result = await lookupUserByEmail(restaurantEmail.trim());
      if (!isRestaurantUser(result.data)) {
        setLookupError(t('onboarding.notARestaurant'));
        setRestaurant(null);
        return;
      }
      const restaurantData = toRestaurantData(result.data);
      if (!restaurantData) {
        setLookupError(t('onboarding.restaurantNotFound'));
        setRestaurant(null);
        return;
      }
      setRestaurant(restaurantData);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'USER_NOT_FOUND') {
          setLookupError(t('onboarding.restaurantNotFound'));
        } else {
          setLookupError(t('onboarding.lookupFailed'));
        }
      } else {
        setLookupError(t('onboarding.lookupFailed'));
      }
      setRestaurant(null);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleContinue = async () => {
    if (!isValid) return;
    setError(null);
    setLoading(true);
    try {
      const profile = await updateProfile({
        name: name.trim(),
        email: email.trim() || null,
        tin: tin.trim() || null,
        restaurant_id: restaurant?.id || null,
        restaurant_name: restaurant?.name || null,
      });
      updateChef({ name: profile.name });

      // Mark profile step complete
      if (chef?.id) {
        const state = await loadOnboardingState(chef.id);
        await saveOnboardingState(chef.id, { ...state, profileComplete: true });
      }

      router.push('/(onboarding)/kitchen');
    } catch (err) {
      if (err instanceof ApiError) {
        switch (err.kind) {
          case 'validation':
            setError(t('onboarding.invalidProfile'));
            break;
          case 'transport':
            setError(t('onboarding.noConnection'));
            break;
          default:
            setError(t('onboarding.saveError'));
        }
      } else {
        setError(t('auth.somethingWrong'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior="padding" keyboardVerticalOffset={0}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Progress indicator */}
        <View style={styles.progress}>
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
        </View>

        {/* Heading */}
        <Text style={styles.eyebrow}>{t('onboarding.stepProfile')}</Text>
        <Text style={styles.heading}>{t('onboarding.profileTitle')}</Text>
        <Text style={styles.sub}>{t('onboarding.profileSubtitle')}</Text>

        {/* Photo picker */}
        <TouchableOpacity onPress={showPhotoPicker} style={styles.photoContainer}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Camera size={32} color={authPalette.muted} />
              <Text style={styles.photoText}>{t('onboarding.addPhoto')}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Name input (required) */}
        <Text style={styles.label}>
          {t('onboarding.nameLabel')} <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          keyboardAppearance="dark"
          value={name}
          onChangeText={(v) => {
            setName(v);
            setError(null);
          }}
          placeholder={t('onboarding.namePlaceholder')}
          placeholderTextColor={authPalette.muted}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          accessibilityLabel={t('onboarding.nameLabel')}
          style={styles.input}
        />

        {/* Email input (optional) */}
        <Text style={styles.label}>{t('onboarding.emailLabel')}</Text>
        <TextInput
          keyboardAppearance="dark"
          value={email}
          onChangeText={setEmail}
          placeholder={t('onboarding.emailPlaceholder')}
          placeholderTextColor={authPalette.muted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          accessibilityLabel={t('onboarding.emailLabel')}
          style={styles.input}
        />

        {/* TIN input (optional) */}
        <Text style={styles.label}>{t('onboarding.tinLabel')}</Text>
        <TextInput
          keyboardAppearance="dark"
          value={tin}
          onChangeText={setTin}
          placeholder={t('onboarding.tinPlaceholder')}
          placeholderTextColor={authPalette.muted}
          autoCapitalize="characters"
          accessibilityLabel={t('onboarding.tinLabel')}
          style={styles.input}
        />

        {/* Restaurant linkage */}
        <Text style={styles.sectionTitle}>{t('onboarding.restaurantLinkage')}</Text>
        <Text style={styles.sectionSub}>{t('onboarding.restaurantLinkageDesc')}</Text>

        <Text style={styles.label}>{t('onboarding.restaurantEmailLabel')}</Text>
        <View style={styles.lookupRow}>
          <TextInput
            keyboardAppearance="dark"
            value={restaurantEmail}
            onChangeText={(v) => {
              setRestaurantEmail(v);
              setLookupError(null);
              if (restaurant) setRestaurant(null);
            }}
            placeholder={t('onboarding.restaurantEmailPlaceholder')}
            placeholderTextColor={authPalette.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            accessibilityLabel={t('onboarding.restaurantEmailLabel')}
            style={[styles.input, styles.inputInline]}
          />
          <AppPressable
            onPress={handleRestaurantLookup}
            disabled={!restaurantEmail.trim() || lookupLoading}
            accessibilityRole="button"
            accessibilityLabel={t('onboarding.lookupButton')}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <View
              style={[
                styles.lookupBtn,
                (!restaurantEmail.trim() || lookupLoading) && styles.lookupBtnDisabled,
              ]}
            >
              {lookupLoading ? (
                <ActivityIndicator size="small" color={colors.black} />
              ) : (
                <Text style={styles.lookupBtnText}>{t('onboarding.lookup')}</Text>
              )}
            </View>
          </AppPressable>
        </View>

        {lookupError ? <Text style={styles.errorText}>{lookupError}</Text> : null}

        {restaurant ? (
          <View style={styles.restaurantCard}>
            <View style={styles.restaurantIcon}>
              <Building2 size={24} color={colors.action} />
            </View>
            <View style={styles.restaurantInfo}>
              <Text style={styles.restaurantName}>{restaurant.name}</Text>
              <Text style={styles.restaurantEmail}>{restaurant.email}</Text>
              {restaurant.tin ? (
                <Text style={styles.restaurantTin}>TIN: {restaurant.tin}</Text>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={() => setRestaurant(null)}
              style={styles.restaurantRemove}
              accessibilityRole="button"
              accessibilityLabel={t('onboarding.removeRestaurant')}
            >
              <X size={20} color={authPalette.muted} />
            </TouchableOpacity>
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      {/* CTA */}
      <View style={[styles.cta, { paddingBottom: Math.max(insets.bottom + 12, 28) }]}>
        <AppPressable
          onPress={handleContinue}
          disabled={!isValid || loading}
          accessibilityRole="button"
          accessibilityLabel={t('common.continue')}
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <View style={[styles.btn, (!isValid || loading) && styles.btnDisabled]}>
            <Text style={[styles.btnText, (!isValid || loading) && styles.btnTextDisabled]}>
              {loading ? t('common.saving') : t('common.continue')}
            </Text>
          </View>
        </AppPressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: authPalette.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  progress: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
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
  eyebrow: {
    color: colors.action,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heading: {
    color: colors.white,
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  sub: {
    color: authPalette.muted,
    fontSize: 15,
    marginBottom: 24,
    lineHeight: 22,
  },
  photoContainer: {
    alignSelf: 'center',
    marginBottom: 24,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: authPalette.card,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: authPalette.card,
    borderWidth: 2,
    borderColor: authPalette.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoText: {
    color: authPalette.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  label: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  required: {
    color: authPalette.error,
  },
  sectionTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 4,
  },
  sectionSub: {
    color: authPalette.muted,
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  input: {
    backgroundColor: authPalette.input,
    color: colors.white,
    fontSize: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: authPalette.inputBorder,
    marginBottom: 16,
  },
  lookupRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  inputInline: {
    flex: 1,
    marginBottom: 0,
  },
  lookupBtn: {
    backgroundColor: colors.action,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    justifyContent: 'center',
    minWidth: 80,
  },
  lookupBtnDisabled: {
    backgroundColor: authPalette.card,
  },
  lookupBtnText: {
    color: colors.black,
    fontWeight: '700',
    fontSize: 15,
  },
  restaurantCard: {
    backgroundColor: authPalette.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.action,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  restaurantIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: authPalette.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  restaurantEmail: {
    color: authPalette.muted,
    fontSize: 13,
  },
  restaurantTin: {
    color: authPalette.muted,
    fontSize: 12,
    marginTop: 2,
  },
  restaurantRemove: {
    padding: 8,
  },
  errorText: {
    color: authPalette.error,
    fontSize: 13,
    marginTop: -8,
    marginBottom: 16,
  },
  cta: {
    paddingHorizontal: 24,
    paddingTop: 14,
    backgroundColor: authPalette.bg,
    borderTopWidth: 1,
    borderTopColor: authPalette.ctaBar,
  },
  btn: {
    width: '80%',
    alignSelf: 'center',
    backgroundColor: colors.action,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.white,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: colors.action,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 10,
  },
  btnDisabled: {
    backgroundColor: authPalette.card,
    borderColor: authPalette.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  btnText: {
    color: colors.black,
    fontWeight: '800',
    fontSize: 17,
    letterSpacing: 0.3,
  },
  btnTextDisabled: {
    color: authPalette.divider,
  },
});
