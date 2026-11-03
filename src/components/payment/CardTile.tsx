import { StyleSheet, Text, View } from 'react-native';
import { space, text, useTheme } from '@/theme';
import { useT } from '@/i18n';
import { PaymentTileBase } from './PaymentTileBase';

export interface CardTileProps {
  selected: boolean;
  onPress: () => void;
  maskedNumber?: string;
}

export function CardTile({ selected, onPress, maskedNumber = '•••• •••• •••• 0000' }: CardTileProps) {
  const t = useT();
  const { colors } = useTheme();

  return (
    <PaymentTileBase
      selected={selected}
      onPress={onPress}
      accessibilityLabel={t('a11y_payWithCard')}
      title={t('paymentTile_cardTitle')}
      subtitle={t('paymentTile_cardSubtitle')}
      logos={
        <View style={styles.logos}>
          <View style={[styles.logo, { backgroundColor: colors.visa }]}>
            <Text style={[styles.logoLabel, { color: colors.paper }]}>VISA</Text>
          </View>
          <View style={[styles.logo, { backgroundColor: colors.mastercard }]}>
            <Text style={[styles.logoLabel, { color: colors.paper }]}>MC</Text>
          </View>
        </View>
      }
      expandedContent={
        <View>
          <Text style={[styles.masked, { color: colors.ink }]}>{maskedNumber}</Text>
          <Text style={[styles.note, { color: colors.muted }]}>{t('paymentTile_cardNote')}</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  logos: { flexDirection: 'row', gap: space.xs },
  logo: { width: 32, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  logoLabel: { ...text.micro },
  masked: { ...text.bodySemi, fontVariant: ['tabular-nums'] },
  note: { ...text.caption, marginTop: 2 },
});
