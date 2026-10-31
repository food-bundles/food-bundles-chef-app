import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSessionStore } from '@/store/session-store';

/** Mock OTP for demo — any 6-digit code is accepted */
const MOCK_OTP_HINT = '123456';

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
    await new Promise((r) => setTimeout(r, 800));
    // Mock: accept any 6-digit code
    if (otp.length === 6) {
      signIn({ phone: phone ?? '', id: `chef-${phone}` });
      router.replace('/(app)/(tabs)');
    } else {
      setError('Invalid code. Please try again.');
    }
    setLoading(false);
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
        <Text className="text-surface-400 mb-1">
          Sent to <Text className="text-white">{phone}</Text>
        </Text>
        <Text className="text-surface-500 text-xs mb-8">
          Demo: enter any 6 digits (hint: {MOCK_OTP_HINT})
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
