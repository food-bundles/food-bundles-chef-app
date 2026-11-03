import { StyleSheet, Text, View } from 'react-native';
import { radius, space, text, useTheme } from '@/theme';
import type { ColorPalette } from '@/theme';
import type { OrderStatus } from '@/mocks/types';
import { useT } from '@/i18n';
import type { TranslationKey } from '@/i18n';

const STATUS_KEY: Record<OrderStatus, TranslationKey> = {
  PENDING: 'st_pending',
  CONFIRMED: 'st_confirmed',
  PREPARING: 'st_preparing',
  READY: 'st_ready',
  IN_TRANSIT: 'st_intransit',
  DELIVERED: 'st_delivered',
  CANCELLED: 'st_cancelled',
  REFUNDED: 'st_refunded',
};

const STATUS_BG = (colors: ColorPalette): Record<OrderStatus, string> => ({
  PENDING: colors.neutral,
  CONFIRMED: colors.tintLeaf,
  PREPARING: colors.tintLeaf,
  READY: colors.tintLeaf,
  IN_TRANSIT: colors.tintMarigold,
  DELIVERED: colors.tintRipe,
  CANCELLED: colors.tintChili,
  REFUNDED: colors.neutral,
});

const STATUS_TEXT = (colors: ColorPalette): Record<OrderStatus, string> => ({
  PENDING: colors.secondary,
  CONFIRMED: colors.pine,
  PREPARING: colors.pine,
  READY: colors.pine,
  IN_TRANSIT: colors.tintedAmberText,
  DELIVERED: colors.tintedGreenText,
  CANCELLED: colors.tintedRedText,
  REFUNDED: colors.tintedRedText,
});

export interface OrderStatusBadgeProps {
  status: OrderStatus;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const t = useT();
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: STATUS_BG(colors)[status] },
        status === 'REFUNDED' && [styles.dashed, { borderColor: colors.refundedDashed }],
      ]}
    >
      <Text style={[styles.label, { color: STATUS_TEXT(colors)[status] }]}>{t(STATUS_KEY[status])}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: space.md - 1,
    paddingVertical: space.xs + 1,
  },
  dashed: { borderWidth: 1, borderStyle: 'dashed' },
  label: { ...text.overline },
});
