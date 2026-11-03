import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { verifyOtp, getMe, registerPushToken } from '@/api/auth-api';
import { listKitchens } from '@/api/kitchens-api';
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
      // Decide destination: new chefs with no kitchen go to create, others to tabs
      let destination: string = '/(app)/(tabs)';
      try {
        const kitchens = await listKitchens();
        if (kitchens.filter((k) => !k.archived_at).length === 0) {
          destination = '/(app)/kitchens/create';
        }
      } catch {
        // If kitchen fetch fails, default to tabs — (app)/_layout guards further
      }
      router.replace(destination as Parameters<typeof router.replace>[0]);
    } catch (err) {
      if (err instanceof ApiError) {
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
      style={{ flex: 1, backgroundColor: '#0E2A18' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={{ flex: 1, paddingHorizontal: 24, paddingTop: insets.top + 16, paddingBottom: insets.bottom }}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={{ marginBottom: 32, width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
            backgroundColor: '#1A3D22', borderRadius: 20 }}
        >
          <Text style={{ color: '#A7C4A0', fontSize: 18, lineHeight: 20 }}>←</Text>
        </Pressable>

        <Text style={{ color: '#22C55E', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
          Verify
        </Text>
        <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '800', marginBottom: 8 }}>
          Enter the code
        </Text>
        <Text style={{ color: '#A7C4A0', fontSize: 15, marginBottom: 32, lineHeight: 22 }}>
          Sent to <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>{phone}</Text>
        </Text>

        <TextInput
          value={otp}
          onChangeText={(v) => { setOtp(v.replace(/\D/g, '').slice(0, 6)); setError(null); }}
          placeholder="— — — — — —"
          placeholderTextColor="#3A5A3A"
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          textAlign="center"
          accessibilityLabel="One-time code"
          style={{
            backgroundColor: '#163A20',
            color: '#FFFFFF',
            fontSize: 32,
            fontWeight: '700',
            borderRadius: 14,
            paddingHorizontal: 18,
            paddingVertical: 20,
            borderWidth: 1.5,
            borderColor: error ? '#EF4444' : isValid ? '#22C55E' : '#2A5230',
            letterSpacing: 8,
            marginBottom: 8,
          }}
        />

        {error ? (
          <Text style={{ color: '#EF4444', fontSize: 13, marginBottom: 16, marginTop: 4 }}>{error}</Text>
        ) : null}

        <View style={{ flex: 1 }} />

        <Pressable
          onPress={handleVerify}
          disabled={!isValid || loading}
          accessibilityRole="button"
          accessibilityLabel="Verify code"
          style={({ pressed }) => ({
            borderRadius: 50,
            paddingVertical: 18,
            alignItems: 'center',
            backgroundColor: isValid && !loading ? '#22C55E' : '#1A3D22',
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{
            fontWeight: '800',
            fontSize: 16,
            color: isValid && !loading ? '#0E2A18' : '#3A5A3A',
          }}>
            {loading ? 'Verifying…' : 'Verify & Continue ›'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
