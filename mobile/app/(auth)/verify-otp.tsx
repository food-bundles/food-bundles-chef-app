import { View, Text, TextInput, Pressable, KeyboardAvoidingView, ScrollView, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { verifyOtp, getMe } from '@/api/auth-api';
import { listKitchens } from '@/api/kitchens-api';
import { ApiError } from '@/api/errors';
import { useSessionStore } from '@/store/session-store';

async function tryRegisterPushToken(): Promise<void> {
  // Push token registration disabled until Firebase is configured
}

export default function VerifyOtpScreen() {
  const insets = useSafeAreaInsets();
  const { phone } = useLocalSearchParams<{ phone: string }>();
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
      let destination: string = '/(app)/(tabs)';
      try {
        const kitchens = await listKitchens();
        if (kitchens.filter((k) => !k.archived_at).length === 0) {
          destination = '/(app)/kitchens/create';
        }
      } catch { /* default to tabs */ }
      router.replace(destination as Parameters<typeof router.replace>[0]);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errorCode === 'OTP_EXPIRED') {
          setError('Incorrect code. Please check and try again.');
        } else if (err.errorCode === 'OTP_MAX_ATTEMPTS') {
          setError('Too many failed attempts. Please request a new code.');
        } else {
          switch (err.kind) {
            case 'auth':
            case 'validation': setError('Invalid code. Please check and try again.'); break;
            case 'rate_limit': setError('Too many attempts. Please wait a moment.'); break;
            case 'transport': setError('No connection. Check your internet and try again.'); break;
            default: setError('Could not verify. Please try again.');
          }
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
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backBtn}
        >
          <Text style={styles.backArrow}>←</Text>
        </Pressable>

        {/* Heading */}
        <Text style={styles.eyebrow}>Verify</Text>
        <Text style={styles.heading}>Enter the code</Text>
        <Text style={styles.sub}>
          Sent to <Text style={styles.subPhone}>{phone}</Text>
        </Text>

        {/* OTP input */}
        <TextInput
          value={otp}
          onChangeText={(v) => { setOtp(v.replace(/\D/g, '').slice(0, 6)); setError(null); }}
          placeholder="— — — — — —"
          placeholderTextColor="#6B9966"
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          textAlign="center"
          accessibilityLabel="One-time code"
          style={[
            styles.input,
            error ? styles.inputError : isValid ? styles.inputValid : null,
          ]}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

      </ScrollView>

      {/* CTA — sits above keyboard when it rises */}
      <View style={[styles.cta, { paddingBottom: Math.max(insets.bottom + 12, 28) }]}>
        <Pressable
          onPress={handleVerify}
          disabled={!isValid || loading}
          accessibilityRole="button"
          accessibilityLabel="Verify code"
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <View style={[styles.btn, (!isValid || loading) && styles.btnDisabled]}>
            <Text style={[styles.btnText, (!isValid || loading) && styles.btnTextDisabled]}>
              {loading ? 'Verifying…' : 'Verify & Continue  →'}
            </Text>
          </View>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#091A0D',
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
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#112B18',
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#1E4028',
  },
  backArrow: {
    color: '#4ADE80',
    fontSize: 18,
    lineHeight: 20,
  },
  eyebrow: {
    color: '#22C55E',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  sub: {
    color: '#6B9966',
    fontSize: 15,
    marginBottom: 36,
    lineHeight: 22,
  },
  subPhone: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#0E2516',
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '700',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 20,
    borderWidth: 1.5,
    borderColor: '#1C3D24',
    letterSpacing: 10,
  },
  inputValid: {
    borderColor: '#22C55E',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginTop: 10,
  },

  // CTA
  cta: {
    paddingHorizontal: 24,
    paddingTop: 14,
    backgroundColor: '#091A0D',
    borderTopWidth: 1,
    borderTopColor: '#1A3522',
  },
  btn: {
    width: '80%',
    alignSelf: 'center',
    backgroundColor: '#22C55E',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 10,
  },
  btnDisabled: {
    backgroundColor: '#112B18',
    borderColor: '#1E4028',
    shadowOpacity: 0,
    elevation: 0,
  },
  btnText: {
    color: '#000000',
    fontWeight: '800',
    fontSize: 17,
    letterSpacing: 0.3,
  },
  btnTextDisabled: {
    color: '#2E5229',
  },
});
