import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { colors, radius, spacing, fontSize, fontWeight, MIN_TOUCH_SIZE } from '@/lib/theme';

export interface QuantitySelectorProps {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  min?: number;
  max?: number;
  unit?: string;
  accessibilityLabel?: string;
}

/** Touch-friendly quantity stepper for order/delivery entry */
export function QuantitySelector({
  value,
  onDecrement,
  onIncrement,
  min = 0,
  max,
  unit,
  accessibilityLabel = 'Quantity',
}: QuantitySelectorProps) {
  const canDecrement = value > min;
  const canIncrement = max === undefined || value < max;

  return (
    <View
      style={styles.row}
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: `${value}${unit ? ' ' + unit : ''}` }}
    >
      <Pressable
        onPress={onDecrement}
        disabled={!canDecrement}
        accessibilityRole="button"
        accessibilityLabel="Decrease quantity"
        accessibilityState={{ disabled: !canDecrement }}
        style={[styles.btn, !canDecrement && styles.btnDisabled]}
      >
        <Minus size={16} color={canDecrement ? colors.white : colors.surface[600]} strokeWidth={2} />
      </Pressable>

      <View style={styles.valueBox}>
        <Text style={styles.value}>{value}</Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>

      <Pressable
        onPress={onIncrement}
        disabled={!canIncrement}
        accessibilityRole="button"
        accessibilityLabel="Increase quantity"
        accessibilityState={{ disabled: !canIncrement }}
        style={[styles.btn, !canIncrement && styles.btnDisabled]}
      >
        <Plus size={16} color={canIncrement ? colors.white : colors.surface[600]} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  btn: {
    width: MIN_TOUCH_SIZE,
    height: MIN_TOUCH_SIZE,
    borderRadius: radius.md,
    backgroundColor: colors.surface[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  valueBox: { alignItems: 'center', minWidth: 48 },
  value: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  unit: {
    color: colors.surface[500],
    fontSize: fontSize.xs,
    marginTop: 1,
  },
});
