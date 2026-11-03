import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { VoucherIcon } from '@/components/icons';
import { useT } from '@/i18n';
import { PaymentTileBase } from './PaymentTileBase';

export interface VoucherTileProps {
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export function VoucherTile({ selected, onPress, disabled }: VoucherTileProps) {
  const t = useT();
  const { colors } = useTheme();

  return (
    <PaymentTileBase
      selected={selected}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={t('a11y_payWithVoucher')}
      title={t('paymentTile_voucherTitle')}
      subtitle={t('paymentTile_voucherSubtitle')}
      logos={
        <View style={[styles.logo, { backgroundColor: colors.tintMarigold }]}>
          <VoucherIcon size={18} color={colors.pine} />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 32,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
