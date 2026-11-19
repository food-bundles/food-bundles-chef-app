import { Image, StyleSheet, Text, View } from 'react-native';
import { Controller, type Control, type FieldErrors, type UseFormSetValue } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Camera, ChefHat, ChevronLeft, MapPin, Users, UtensilsCrossed } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { AppPressable } from '@/components/ui/AppPressable';
import { AppTextField } from '@/components/ui/AppTextField';
import { useTheme } from '@/providers/ThemeProvider';
import { colors, spacing } from '@/lib/theme';
import type { KitchenFormValues } from './kitchen-schema';
import { RegionFields, type RegionFieldsProps } from './RegionFields';

const HERO_HEIGHT = 220;

export interface KitchenFormFieldsProps {
  control: Control<KitchenFormValues>;
  errors: FieldErrors<KitchenFormValues>;
  eyebrow: string;
  title: string;
  subtitle?: string;
  photoUri: string | null;
  onPickPhoto: () => void;
  photoLabel: string;
  autoFocusName?: boolean;
  setValue: UseFormSetValue<KitchenFormValues>;
  /** Edit screen: currency changes only through the convert / relabel flow. */
  currencyLocked?: boolean;
  regionSuggestions?: RegionFieldsProps['suggested'];
  /** Rendered below the fields (archive button, errors). */
  children?: ReactNode;
}

/** Green hero + the four kitchen fields shared by Create and Edit Kitchen. */
export function KitchenFormFields({
  control,
  errors,
  eyebrow,
  title,
  subtitle,
  photoUri,
  onPickPhoto,
  photoLabel,
  autoFocusName = false,
  setValue,
  currencyLocked = false,
  regionSuggestions,
  children,
}: KitchenFormFieldsProps) {
  const { t } = useTranslation();
  const tk = useTheme();
  const insets = useSafeAreaInsets();
  const group = [styles.fieldGroup, { backgroundColor: tk.surfaceRaised, borderColor: tk.border }];
  const iconWrap = [styles.fieldIcon, { backgroundColor: tk.primaryTint }];

  return (
    <View>
      <View style={{ height: HERO_HEIGHT }}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height={HERO_HEIGHT}>
          <Defs>
            <LinearGradient id="kitchenHero" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors.brand[500]} stopOpacity="1" />
              <Stop offset="1" stopColor={colors.brand[800]} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height={HERO_HEIGHT} fill="url(#kitchenHero)" />
        </Svg>

        <AppPressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={[styles.back, { top: insets.top + 4 }]}
        >
          <ChevronLeft size={22} color={colors.white} strokeWidth={2} />
        </AppPressable>

        <View style={[styles.heroText, { top: insets.top + 48 }]}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title} numberOfLines={2} accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>

        <View style={styles.photoAnchor}>
          <AppPressable
            onPress={onPickPhoto}
            accessibilityRole="button"
            accessibilityLabel={photoLabel}
            style={[styles.photo, { backgroundColor: tk.surfaceRaised }]}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoImage} accessibilityIgnoresInvertColors />
            ) : (
              <Camera size={26} color={tk.link} strokeWidth={1.75} />
            )}
          </AppPressable>
        </View>
      </View>

      <View style={styles.fields}>
        <View style={group}>
          <View style={iconWrap}><ChefHat size={16} color={tk.link} strokeWidth={2} /></View>
          <View style={styles.flex}>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <AppTextField
                  label={t('kitchens.kitchenNameLabel')}
                  placeholder={t('kitchens.kitchenNamePlaceholder')}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.name?.message}
                  autoFocus={autoFocusName}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              )}
            />
          </View>
        </View>

        <View style={group}>
          <View style={iconWrap}><UtensilsCrossed size={16} color={tk.link} strokeWidth={2} /></View>
          <View style={styles.flex}>
            <Controller
              control={control}
              name="cuisineType"
              render={({ field: { onChange, onBlur, value } }) => (
                <AppTextField
                  label={t('kitchens.cityLabel')}
                  placeholder={t('kitchens.cityPlaceholder')}
                  value={value ?? ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.cuisineType?.message}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              )}
            />
          </View>
        </View>

        <View style={group}>
          <View style={iconWrap}><MapPin size={16} color={tk.link} strokeWidth={2} /></View>
          <View style={styles.flex}>
            <Controller
              control={control}
              name="address"
              render={({ field: { onChange, onBlur, value } }) => (
                <AppTextField
                  label={t('kitchens.addressLabel')}
                  placeholder={t('kitchens.addressPlaceholder')}
                  value={value ?? ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.address?.message}
                  autoCapitalize="sentences"
                  returnKeyType="next"
                />
              )}
            />
          </View>
        </View>

        <View style={group}>
          <View style={iconWrap}><Users size={16} color={tk.link} strokeWidth={2} /></View>
          <View style={styles.flex}>
            <Controller
              control={control}
              name="seatingCapacity"
              render={({ field: { onChange, onBlur, value } }) => (
                <AppTextField
                  label={t('kitchens.seatingLabel')}
                  placeholder={t('kitchens.seatingPlaceholder')}
                  value={value ?? ''}
                  onChangeText={(v) => onChange(v.replace(/[^0-9]/g, ''))}
                  onBlur={onBlur}
                  error={errors.seatingCapacity?.message}
                  keyboardType="number-pad"
                  returnKeyType="done"
                />
              )}
            />
          </View>
        </View>

        <RegionFields
          control={control}
          errors={errors}
          setValue={setValue}
          currencyLocked={currencyLocked}
          suggested={regionSuggestions}
        />

        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  back: {
    position: 'absolute',
    left: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 48,
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    textAlign: 'center',
  },
  photoAnchor: {
    position: 'absolute',
    bottom: -36,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  photoImage: { width: 80, height: 80 },
  fields: {
    marginTop: 52,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
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
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
});
