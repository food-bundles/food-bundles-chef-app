import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { AppPressable } from '@/components/ui/AppPressable';
import { router } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronDown } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { requestOtp } from '@/api/auth-api';
import { ApiError } from '@/api/errors';
import { authPalette, colors } from '@/lib/theme';
import { CountryPicker } from '@/components/ui/CountryPicker';
import { COUNTRIES, type Country } from '@/data/countries';
import { validateAndFormatPhone, isPhonePotentiallyValid } from '@/domain/rules/phone-validation';

export default function PhoneNumberScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [country, setCountry] = useState<Country>(COUNTRIES[0]); // Rwanda first
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);

  const isValid = isPhonePotentiallyValid(phone, country);

  const handleContinue = async () => {
    if (!isValid) {
      setError(t('auth.invalidPhone'));
      return;
    }
    setError(null);

    const validation = validateAndFormatPhone(phone, country);
    if (!validation.e164) {
      setError(validation.error);
      return;
    }

    setLoading(true);
    try {
      await requestOtp({ phone_number: validation.e164 });
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { phone: validation.e164, countryIso: country.iso },
      });
    } catch (err) {
      if (err instanceof ApiError) {
        switch (err.kind) {
          case 'rate_limit':
            setError(t('auth.tooManyAttempts'));
            break;
          case 'transport':
            setError(t('auth.noConnection'));
            break;
          default:
            setError(t('auth.sendCodeError'));
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
        {/* Back */}
        <AppPressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={styles.backBtn}
        >
          <ChevronLeft size={22} color={authPalette.placeholder} strokeWidth={2} />
        </AppPressable>

        {/* Heading */}
        <Text style={styles.eyebrow}>{t('auth.signIn')}</Text>
        <Text style={styles.heading}>{t('auth.enterPhone')}</Text>
        <Text style={styles.sub}>{t('auth.smsSub')}</Text>

        {/* Country + Phone Input */}
        <Text style={styles.label}>{t('auth.phoneLabel')}</Text>
        <View style={styles.inputRow}>
          <Pressable
            onPress={() => setPickerVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={t('auth.selectCountry')}
            style={styles.countryButton}
          >
            <Text style={styles.countryFlag}>{country.flag}</Text>
            <Text style={styles.countryCode}>{country.dialCode}</Text>
            <ChevronDown size={18} color={authPalette.muted} />
          </Pressable>
          <TextInput
            keyboardAppearance="dark"
            value={phone}
            onChangeText={(v) => {
              setPhone(v);
              setError(null);
            }}
            placeholder={t('auth.phonePlaceholder')}
            placeholderTextColor={authPalette.muted}
            keyboardType="phone-pad"
            autoFocus
            accessibilityLabel={t('auth.phoneNumberLabel')}
            style={[styles.input, error ? styles.inputError : null]}
          />
        </View>
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
              {loading ? t('auth.sendingCode') : t('auth.continueButton')}
            </Text>
          </View>
        </AppPressable>
      </View>

      <CountryPicker
        visible={pickerVisible}
        selectedCountry={country}
        onSelect={setCountry}
        onClose={() => setPickerVisible(false)}
      />
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
  backBtn: {
    marginBottom: 32,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: authPalette.card,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: authPalette.border,
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
    marginBottom: 36,
    lineHeight: 22,
  },
  label: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  countryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: authPalette.input,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 18,
    borderWidth: 1.5,
    borderColor: authPalette.inputBorder,
  },
  countryFlag: {
    fontSize: 24,
  },
  countryCode: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    backgroundColor: authPalette.input,
    color: colors.white,
    fontSize: 17,
    fontWeight: '600',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1.5,
    borderColor: authPalette.inputBorder,
  },
  inputError: {
    borderColor: authPalette.error,
  },
  errorText: {
    color: authPalette.error,
    fontSize: 13,
    marginTop: 10,
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
    marginBottom: 36,
    lineHeight: 22,
  },
  label: {
    color: authPalette.mutedDim,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: authPalette.input,
    color: colors.white,
    fontSize: 20,
    fontWeight: '600',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: authPalette.inputBorder,
  },
  inputError: {
    borderColor: authPalette.error,
  },
  errorText: {
    color: authPalette.error,
    fontSize: 13,
    marginTop: 8,
  },

  // CTA
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
