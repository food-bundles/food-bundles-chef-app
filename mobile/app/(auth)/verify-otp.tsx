import { View, Text, TextInput, KeyboardAvoidingView, ScrollView, StyleSheet } from 'react-native';
import { AppPressable } from '@/components/ui/AppPressable';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { verifyOtp, getMe, updateProfile } from '@/api/auth-api';
import { listKitchens } from '@/api/kitchens-api';
import { ApiError } from '@/api/errors';
import { useSessionStore } from '@/store/session-store';
import { authPalette, colors } from '@/lib/theme';
import * as SecureStore from 'expo-secure-store';

async function tryRegisterPushToken(): Promise<void> {
  // Push token registration disabled until Firebase is configured
}

const SECURE_COUNTRY_KEY = 'fb.chef.pending_country';

export default function VerifyOtpScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { phone, countryIso } = useLocalSearchParams<{ phone: string; countryIso?: string }>();
  const signIn = useSessionStore((s) => s.signIn);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = otp.length === 6;

  const handleVerify = async () => {
    if (!isValid) return;
    setError(null);
    setLoading(true);
    try {
      const tokens = await verifyOtp({ phone_number: phone ?? '', code: otp });
      await signIn({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        chef: { id: '', phoneNumber: phone ?? '', name: null },
      });
      const profile = await getMe();
      await signIn({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        chef: { id: profile.id, phoneNumber: profile.phone_number, name: profile.name },
      });
      void tryRegisterPushToken();

      // Save country to profile if provided
      if (countryIso) {
        try {
          await updateProfile({ country: countryIso });
        } catch {
          // If update fails, save to SecureStore for retry on next launch
          await SecureStore.setItemAsync(SECURE_COUNTRY_KEY, countryIso);
        }
      }

      let destination: string = '/(app)/(tabs)';
      try {
        const kitchens = await listKitchens();
        if (kitchens.filter((k) => !k.archived_at).length === 0) {
          destination = '/(app)/kitchens/create';
        }
      } catch {
        /* default to tabs */
      }
      router.replace(destination as Parameters<typeof router.replace>[0]);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errorCode === 'OTP_EXPIRED') {
          setError(t('auth.incorrectCode'));
        } else if (err.errorCode === 'OTP_MAX_ATTEMPTS') {
          setError(t('auth.tooManyFailedAttempts'));
        } else {
          switch (err.kind) {
            case 'auth':
            case 'validation':
              setError(t('auth.invalidCodeCheck'));
              break;
            case 'rate_limit':
              setError(t('auth.tooManyAttemptsWait'));
              break;
            case 'transport':
              setError(t('auth.noConnectionCheck'));
              break;
            default:
              setError(t('auth.verifyError'));
          }
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
      {/* Content */}
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
        <Text style={styles.eyebrow}>{t('auth.verify')}</Text>
        <Text style={styles.heading}>{t('auth.enterCode')}</Text>
        <Text style={styles.sub}>
          {t('auth.codeSentTo')} <Text style={styles.subPhone}>{phone}</Text>
        </Text>

        {/* OTP input */}
        <TextInput
          keyboardAppearance="dark"
          value={otp}
          onChangeText={(v) => {
            setOtp(v.replace(/\D/g, '').slice(0, 6));
            setError(null);
          }}
          placeholder="— — — — — —"
          placeholderTextColor={authPalette.muted}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          textAlign="center"
          accessibilityLabel={t('auth.otpLabel')}
          style={[styles.input, error ? styles.inputError : isValid ? styles.inputValid : null]}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      {/* CTA — sits above keyboard when it rises */}
      <View style={[styles.cta, { paddingBottom: Math.max(insets.bottom + 12, 28) }]}>
        <AppPressable
          onPress={handleVerify}
          disabled={!isValid || loading}
          accessibilityRole="button"
          accessibilityLabel={t('auth.verifyCodeLabel')}
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <View style={[styles.btn, (!isValid || loading) && styles.btnDisabled]}>
            <Text style={[styles.btnText, (!isValid || loading) && styles.btnTextDisabled]}>
              {loading ? t('auth.verifying') : t('auth.verifyButton')}
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
  subPhone: {
    color: colors.white,
    fontWeight: '700',
  },
  input: {
    backgroundColor: authPalette.input,
    color: colors.white,
    fontSize: 34,
    fontWeight: '700',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 20,
    borderWidth: 1.5,
    borderColor: authPalette.inputBorder,
    letterSpacing: 10,
  },
  inputValid: {
    borderColor: colors.action,
  },
  inputError: {
    borderColor: authPalette.error,
  },
  errorText: {
    color: authPalette.error,
    fontSize: 13,
    marginTop: 10,
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
