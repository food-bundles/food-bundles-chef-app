import { StyleSheet, Text, View } from 'react-native';
import { radius, space, text, useTheme } from '@/theme';
import { PriceText } from '@/components/product';
import { useGuestCartStore } from '@/stores';
import { useT } from '@/i18n';

export function GuestTotalsCard() {
  const t = useT();
  const { colors } = useTheme();
  const subtotal = useGuestCartStore((state) => state.subtotal());
  const deliveryFee = useGuestCartStore((state) => state.deliveryFee());
  const total = useGuestCartStore((state) => state.total());

  return (
    <View style={[styles.card, { backgroundColor: colors.paper, borderColor: colors.hairline }]}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.body }]}>{t('guest_subtotal')}</Text>
        <PriceText amount={subtotal} size="md" />
      </View>
      {deliveryFee > 0 ? (
        <View style={styles.row}>
          <Text style={[styles.feeNote, { color: colors.tintedAmberText }]}>{t('guest_smallOrderFee')}</Text>
          <PriceText amount={deliveryFee} size="md" />
        </View>
      ) : null}
      <View style={[styles.row, styles.totalRow, { borderTopColor: colors.hairline }]}>
        <Text style={[styles.totalLabel, { color: colors.ink }]}>{t('guest_total')}</Text>
        <PriceText amount={total} size="lg" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.lg,
    gap: space.sm,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  label: { ...text.body },
  feeNote: { ...text.caption },
  totalRow: { marginTop: space.sm, paddingTop: space.sm, borderTopWidth: 1 },
  totalLabel: { ...text.bodySemi },
});
