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
          Sign in
        </Text>
        <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '800', marginBottom: 8 }}>
          Enter your phone
        </Text>
        <Text style={{ color: '#A7C4A0', fontSize: 15, marginBottom: 32, lineHeight: 22 }}>
          We'll send you a one-time code to verify your number.
        </Text>

        <View style={{ marginBottom: 8 }}>
          <Text style={{ color: '#5A7A54', fontSize: 11, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Phone Number
          </Text>
          <TextInput
            value={phone}
            onChangeText={(v) => { setPhone(v); setError(null); }}
            placeholder="+250 7XX XXX XXX"
            placeholderTextColor="#3A5A3A"
            keyboardType="phone-pad"
            autoFocus
            accessibilityLabel="Phone number"
            style={{
              backgroundColor: '#163A20',
              color: '#FFFFFF',
              fontSize: 18,
              borderRadius: 14,
              paddingHorizontal: 18,
              paddingVertical: 16,
              borderWidth: 1.5,
              borderColor: error ? '#EF4444' : '#2A5230',
            }}
          />
        </View>

        {error ? (
          <Text style={{ color: '#EF4444', fontSize: 13, marginBottom: 16, marginTop: 4 }}>{error}</Text>
        ) : null}

        <View style={{ flex: 1 }} />

        <Pressable
          onPress={handleContinue}
          disabled={!isValid || loading}
          accessibilityRole="button"
          accessibilityLabel="Continue"
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
            {loading ? 'Sending code…' : 'Continue ›'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
