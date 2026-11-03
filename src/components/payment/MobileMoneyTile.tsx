import { Pressable, StyleSheet, Text, View } from 'react-native';
import { hit, space, text, useTheme } from '@/theme';
import { detectTelecom } from '@/lib';
import { useT } from '@/i18n';
import { PaymentTileBase } from './PaymentTileBase';

export interface MobileMoneyTileProps {
  selected: boolean;
  onPress: () => void;
  phone: string;
  onChangeNumber: () => void;
}

function TelecomLogo({
  label,
  active,
  tint,
  textColor,
}: {
  label: string;
  active: boolean;
  tint: string;
  textColor: string;
}) {
  return (
    <View style={[styles.logo, { backgroundColor: tint, opacity: active ? 1 : 0.32 }]}>
      <Text style={[styles.logoLabel, { color: textColor }]}>{label}</Text>
    </View>
  );
}

export function MobileMoneyTile({ selected, onPress, phone, onChangeNumber }: MobileMoneyTileProps) {
  const t = useT();
  const { colors } = useTheme();
  const telecom = detectTelecom(phone);

  return (
    <PaymentTileBase
      selected={selected}
      onPress={onPress}
      accessibilityLabel={t('a11y_payWithMobileMoney')}
      title={t('paymentTile_mobileMoneyTitle')}
      subtitle={t('paymentTile_mobileMoneySubtitle')}
      logos={
        <View style={styles.logos}>
          <TelecomLogo label="MTN" active={telecom === 'MTN'} tint={colors.mtn} textColor={colors.ink} />
          <TelecomLogo label="Airtel" active={telecom === 'AIRTEL'} tint={colors.airtel} textColor={colors.ink} />
        </View>
      }
      expandedContent={
        <View style={styles.phoneRow}>
          <Text style={[styles.phoneText, { color: colors.ink }]}>{phone}</Text>
          <Pressable
            onPress={onChangeNumber}
            accessibilityRole="button"
            accessibilityLabel={t('a11y_changeMobileNumber')}
            style={styles.changeButton}
          >
            <Text style={[styles.changeLabel, { color: colors.leaf }]}>{t('paymentTile_change')}</Text>
          </Pressable>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  logos: { flexDirection: 'row', gap: space.xs },
  logo: { width: 32, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  logoLabel: { ...text.micro },
  phoneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  phoneText: { ...text.bodySemi },
  changeButton: { minHeight: hit.min, paddingHorizontal: space.sm, alignItems: 'center', justifyContent: 'center' },
  changeLabel: { ...text.label },
});
