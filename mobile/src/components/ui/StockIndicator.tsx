import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, fontSize, fontWeight } from '@/lib/theme';

export interface StockIndicatorProps {
  daysOfCover: number;
  unit?: string;
}

type Level = 'critical' | 'low' | 'ok';

function getLevel(days: number): Level {
  if (days < 1) return 'critical';
  if (days < 3) return 'low';
  return 'ok';
}

const LEVEL_CONFIG: Record<Level, { color: string; label: string }> = {
  critical: { color: colors.danger, label: 'Critical' },
  low: { color: colors.warning, label: 'Low' },
  ok: { color: colors.success, label: 'OK' },
};

/** Stock coverage pill with colour-coded level */
export function StockIndicator({ daysOfCover, unit = 'days' }: StockIndicatorProps) {
  const level = getLevel(daysOfCover);
  const { color, label } = LEVEL_CONFIG[level];
  const displayDays = isFinite(daysOfCover) ? daysOfCover.toFixed(1) : '∞';

  return (
    <View
      style={[styles.container, { borderColor: color }]}
      accessibilityLabel={`Stock: ${label}, ${displayDays} ${unit} cover`}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.days, { color }]}>{displayDays}</Text>
      <Text style={styles.unit}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  days: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  unit: {
    color: colors.surface[500],
    fontSize: fontSize.xs,
  },
});
