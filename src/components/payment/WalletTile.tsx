import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { WalletIcon } from '@/components/icons';
import { formatRwf } from '@/lib';
import { useT } from '@/i18n';
import { PaymentTileBase } from './PaymentTileBase';

export interface WalletTileProps {
  selected: boolean;
  onPress: () => void;
  balance: number;
  disabled?: boolean;
}

export function WalletTile({ selected, onPress, balance, disabled }: WalletTileProps) {
  const t = useT();
  const { colors } = useTheme();

  return (
    <PaymentTileBase
      selected={selected}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={t('a11y_payWithWallet')}
      title={t('paymentTile_walletTitle')}
      subtitle={t('paymentTile_walletBalance', { amount: formatRwf(balance) })}
      logos={
        <View style={[styles.logo, { backgroundColor: colors.tintLeaf }]}>
          <WalletIcon size={18} color={colors.pine} />
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
