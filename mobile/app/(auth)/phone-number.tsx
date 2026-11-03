import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { requestOtp } from '@/api/auth-api';
import { ApiError } from '@/api/errors';

export default function PhoneNumberScreen() {
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = phone.replace(/\D/g, '').length >= 9;

  const handleContinue = async () => {
    if (!isValid) {
      setError('Please enter a valid phone number.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await requestOtp({ phone_number: phone });
      router.push({ pathname: '/(auth)/verify-otp', params: { phone } });
    } catch (err) {
      if (err instanceof ApiError) {
        switch (err.kind) {
          case 'rate_limit':
            setError('Too many attempts. Please wait a moment and try again.');
            break;
          case 'transport':
            setError('No connection. Check your internet and try again.');
            break;
          default:
            setError('Could not send code. Please try again.');
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

        <Text className="text-2xl font-bold text-white mb-2">Enter your phone</Text>
        <Text className="text-surface-400 mb-8">
          We'll send you a one-time code to verify your number.
        </Text>

        <View className="mb-2">
          <Text className="text-surface-400 text-xs font-medium mb-2 uppercase tracking-wider">
            Phone Number
          </Text>
          <TextInput
            value={phone}
            onChangeText={(v) => { setPhone(v); setError(null); }}
            placeholder="+250 7XX XXX XXX"
            placeholderTextColor="#6B6860"
            keyboardType="phone-pad"
            autoFocus
            accessibilityLabel="Phone number"
            className="bg-surface-800 text-white text-lg rounded-xl px-4 py-4 border border-surface-700"
          />
        </View>

        {error ? (
          <Text className="text-danger text-sm mb-4">{error}</Text>
        ) : null}

        <View className="flex-1" />

        <Pressable
          onPress={handleContinue}
          disabled={!isValid || loading}
          accessibilityRole="button"
          accessibilityLabel="Continue"
          className={`rounded-xl py-4 items-center ${isValid && !loading ? 'bg-brand-500 active:opacity-80' : 'bg-surface-700'}`}
        >
          <Text className={`font-semibold text-base ${isValid && !loading ? 'text-white' : 'text-surface-500'}`}>
            {loading ? 'Sending code…' : 'Continue'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
