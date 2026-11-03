import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { verifyOtp, getMe, registerPushToken } from '@/api/auth-api';
import { ApiError } from '@/api/errors';
import { useSessionStore } from '@/store/session-store';

async function tryRegisterPushToken(): Promise<void> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    const finalStatus =
      existing === 'granted'
        ? existing
        : (await Notifications.requestPermissionsAsync()).status;
    if (finalStatus !== 'granted') return;
    const { data: token } = await Notifications.getExpoPushTokenAsync();
    await registerPushToken({ token });
  } catch {
    // Push token registration is best-effort — never block login on failure
  }
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
      // Persist tokens first so http-client can inject the Authorization header
      // for the immediately following GET /auth/me call.
      await signIn({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        chef: { id: '', phoneNumber: phone ?? '', name: null },
      });
      // Now fetch the full profile — tokens are in SecureStore so http-client
      // will send the Bearer header correctly.
      const profile = await getMe();
      await signIn({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        chef: {
          id: profile.id,
          phoneNumber: profile.phone_number,
          name: profile.name,
        },
      });
      // Fire-and-forget: push token registration must not delay navigation
      void tryRegisterPushToken();
      router.replace('/(app)/(tabs)');
    } catch (err) {
      if (err instanceof ApiError) {
        // Check backend error_code first for precise OTP errors
        if (err.errorCode === 'OTP_EXPIRED') {
          setError('Incorrect code. Please check and try again.');
        } else if (err.errorCode === 'OTP_MAX_ATTEMPTS') {
          setError('Too many failed attempts. Please request a new code.');
        } else if (err.errorCode === 'OTP_RESEND_COOLDOWN') {
          setError('Too many attempts. Please wait a moment.');
        } else {
          switch (err.kind) {
            case 'auth':
            case 'validation':
              setError('Invalid code. Please check and try again.');
              break;
            case 'rate_limit':
              setError('Too many attempts. Please wait a moment.');
              break;
            case 'transport':
              setError('No connection. Check your internet and try again.');
              break;
            default:
              setError('Could not verify. Please try again.');
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
      className="flex-1 bg-surface-900"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        className="flex-1 px-6"
        style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom }}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="mb-8 w-10 h-10 items-center justify-center"
        >
          <Text className="text-surface-300 text-2xl">←</Text>
        </Pressable>

        <Text className="text-2xl font-bold text-white mb-2">Enter the code</Text>
        <Text className="text-surface-400 mb-8">
          Sent to <Text className="text-white">{phone}</Text>
        </Text>

        <TextInput
          value={otp}
          onChangeText={(v) => { setOtp(v.replace(/\D/g, '').slice(0, 6)); setError(null); }}
          placeholder="------"
          placeholderTextColor="#6B6860"
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          textAlign="center"
          accessibilityLabel="One-time code"
          className="bg-surface-800 text-white text-3xl font-bold rounded-xl px-4 py-4 border border-surface-700 tracking-widest mb-2"
        />

        {error ? (
          <Text className="text-danger text-sm mb-4">{error}</Text>
        ) : null}

        <View className="flex-1" />

        <Pressable
          onPress={handleVerify}
          disabled={!isValid || loading}
          accessibilityRole="button"
          accessibilityLabel="Verify code"
          className={`rounded-xl py-4 items-center ${isValid && !loading ? 'bg-brand-500 active:opacity-80' : 'bg-surface-700'}`}
        >
          <Text className={`font-semibold text-base ${isValid && !loading ? 'text-white' : 'text-surface-500'}`}>
            {loading ? 'Verifying…' : 'Verify & Continue'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
