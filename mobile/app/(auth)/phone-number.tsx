import { View, Text, TextInput, Pressable, KeyboardAvoidingView, ScrollView, StyleSheet } from 'react-native';
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
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backBtn}
        >
          <Text style={styles.backArrow}>←</Text>
        </Pressable>

        {/* Heading */}
        <Text style={styles.eyebrow}>Sign in</Text>
        <Text style={styles.heading}>Enter your phone</Text>
        <Text style={styles.sub}>We'll send you a one-time code to verify your number.</Text>

        {/* Input */}
        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          value={phone}
          onChangeText={(v) => { setPhone(v); setError(null); }}
          placeholder="+250 7XX XXX XXX"
          placeholderTextColor="#6B9966"
          keyboardType="phone-pad"
          autoFocus
          accessibilityLabel="Phone number"
          style={[styles.input, error ? styles.inputError : null]}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

      </ScrollView>

      {/* CTA — sits above keyboard when it rises */}
      <View style={[styles.cta, { paddingBottom: Math.max(insets.bottom + 12, 28) }]}>
        <Pressable
          onPress={handleContinue}
          disabled={!isValid || loading}
          accessibilityRole="button"
          accessibilityLabel="Continue"
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <View style={[styles.btn, (!isValid || loading) && styles.btnDisabled]}>
            <Text style={[styles.btnText, (!isValid || loading) && styles.btnTextDisabled]}>
              {loading ? 'Sending code…' : 'Send Code  →'}
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
  label: {
    color: '#4D7549',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: '#0E2516',
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: '#1C3D24',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginTop: 8,
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
