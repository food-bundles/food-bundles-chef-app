import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { radius, space, text, useTheme } from '@/theme';
import { ScreenScroll, StickyFooter } from '@/components/layout';
import { Input } from '@/components/primitives';
import { CheckoutStepHeader, DeliveryWindowPicker } from '@/components/checkout';
import { useT } from '@/i18n';

export default function GuestDelivery() {
  const t = useT();
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [landmark, setLandmark] = useState('');
  const [windowIndex, setWindowIndex] = useState(0);

  const canContinue = name.trim().length > 0 && phone.trim().length > 0 && street.trim().length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.oat }]}>
      <CheckoutStepHeader title={t('guest_deliveryDetails')} step={1} />
      <ScreenScroll contentInsetBottom={80} applyTopInset={false}>
        <View style={styles.fields}>
          <Input label={t('guest_contactName')} value={name} onChangeText={setName} />
          <Input label={t('guest_phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Input label={t('guest_street')} value={street} onChangeText={setStreet} />
          <Input label={t('guest_landmark')} value={landmark} onChangeText={setLandmark} />
        </View>
        <View style={styles.windowGap}>
          <DeliveryWindowPicker selected={windowIndex} onSelect={setWindowIndex} />
        </View>
        <Text style={[styles.note, { color: colors.muted }]}>{t('guest_addressNotSaved')}</Text>
      </ScreenScroll>
      <StickyFooter>
        <Pressable
          onPress={() => router.push('/(public)/guest/payment')}
          disabled={!canContinue}
          accessibilityRole="button"
          accessibilityLabel={t('guest_continueToPayment')}
          style={[styles.button, { backgroundColor: colors.leaf }, !canContinue && styles.buttonDisabled]}
        >
          <Text style={[styles.buttonLabel, { color: colors.paper }]}>{t('guest_continueToPayment')}</Text>
        </Pressable>
      </StickyFooter>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fields: { gap: space.md, marginTop: space.md },
  windowGap: { marginTop: space.lg },
  note: { ...text.caption, marginTop: space.md },
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonLabel: { ...text.bodySemi },
});
