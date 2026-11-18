import { StyleSheet, Text, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { AppPressable } from './AppPressable';
import { fontSize, fontWeight, MIN_TOUCH_SIZE, radius, spacing } from '@/lib/theme';
import { useTheme } from '@/providers/ThemeProvider';

export interface QuantitySelectorProps {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  min?: number;
  max?: number;
  unit?: string;
  /** What is being counted, e.g. "Chips, portions sold". Defaults to "Quantity". */
  accessibilityLabel?: string;
}

/** Touch-friendly stepper; "−" is disabled at the minimum (kept from the audit). */
export function QuantitySelector({ value, onDecrement, onIncrement, min = 0, max, unit, accessibilityLabel }: QuantitySelectorProps) {
  const { t } = useTranslation();
  const tokens = useTheme();
  const canDecrement = value > min;
  const canIncrement = max === undefined || value < max;
  const subject = accessibilityLabel ?? t('common.quantity');

  return (
    <View style={styles.row} accessibilityLabel={subject} accessibilityValue={{ text: `${value}${unit ? ` ${unit}` : ''}` }}>
      <AppPressable
        onPress={onDecrement}
        disabled={!canDecrement}
        accessibilityRole="button"
        accessibilityLabel={t('common.decrease', { subject })}
        accessibilityState={{ disabled: !canDecrement }}
        style={({ pressed }) => [
          styles.btn,
          { backgroundColor: tokens.surfaceSunken },
          !canDecrement && styles.btnDisabled,
          pressed && canDecrement && styles.pressed,
        ]}
      >
        <Minus size={18} color={tokens.text} strokeWidth={2} />
      </AppPressable>

      <View style={styles.valueBox}>
        <Text style={[styles.value, { color: tokens.text }]}>{value}</Text>
        {unit ? <Text style={[styles.unit, { color: tokens.textMuted }]}>{unit}</Text> : null}
      </View>

      <AppPressable
        onPress={onIncrement}
        disabled={!canIncrement}
        accessibilityRole="button"
        accessibilityLabel={t('common.increase', { subject })}
        accessibilityState={{ disabled: !canIncrement }}
        style={({ pressed }) => [
          styles.btn,
          { backgroundColor: tokens.surfaceSunken },
          !canIncrement && styles.btnDisabled,
          pressed && canIncrement && styles.pressed,
        ]}
      >
        <Plus size={18} color={tokens.text} strokeWidth={2} />
      </AppPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  btn: { width: MIN_TOUCH_SIZE, height: MIN_TOUCH_SIZE, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
  valueBox: { alignItems: 'center', minWidth: 48 },
  value: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, fontVariant: ['tabular-nums'] },
  unit: { fontSize: fontSize.xs, marginTop: 1 },
});
