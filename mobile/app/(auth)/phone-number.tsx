import { View, Text, TextInput, KeyboardAvoidingView, ScrollView, StyleSheet } from 'react-native';
import { AppPressable } from '@/components/ui/AppPressable';
import { router } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { requestOtp } from '@/api/auth-api';
import { ApiError } from '@/api/errors';
import { authPalette, colors } from '@/lib/theme';

export default function PhoneNumberScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Normalise to E.164: strip spaces/dashes, prepend +250 for local Rwandan numbers
  function toE164(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('250')) return `+${digits}`;
    if (digits.startsWith('0')) return `+250${digits.slice(1)}`;
    if (raw.startsWith('+')) return raw.replace(/\s/g, '');
    return `+250${digits}`;
  }

  const digits = phone.replace(/\D/g, '');
  const isValid = digits.length >= 9;

  const handleContinue = async () => {
    if (!isValid) { setError('Please enter a valid phone number.'); return; }
    setError(null);
    setLoading(true);
    const normalized = toE164(phone);
    try {
      await requestOtp({ phone_number: normalized });
      router.push({ pathname: '/(auth)/verify-otp', params: { phone: normalized } });
    } catch (err) {
      if (err instanceof ApiError) {
        switch (err.kind) {
          case 'rate_limit': setError('Too many attempts. Please wait a moment and try again.'); break;
          case 'transport': setError('No connection. Check your internet and try again.'); break;
          default: setError('Could not send code. Please try again.');
        }
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
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
        <Text style={styles.eyebrow}>{t('auth.signIn')}</Text>
        <Text style={styles.heading}>{t('auth.enterPhone')}</Text>
        <Text style={styles.sub}>{t('auth.smsSub')}</Text>

        {/* Input */}
        <Text style={styles.label}>{t('auth.phoneLabel')}</Text>
        <TextInput
          keyboardAppearance="dark"
          value={phone}
          onChangeText={(v) => { setPhone(v); setError(null); }}
          placeholder={t('auth.phonePlaceholder')}
          placeholderTextColor={authPalette.muted}
          keyboardType="phone-pad"
          autoFocus
          accessibilityLabel={t('auth.phoneNumberLabel')}
          style={[styles.input, error ? styles.inputError : null]}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

      </ScrollView>

      {/* CTA — sits above keyboard when it rises */}
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
