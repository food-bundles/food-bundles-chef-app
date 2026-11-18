import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fontSize, fontWeight, radius, spacing } from '@/lib/theme';
import { formatQuantity } from '@/lib/format';
import { useTheme } from '@/providers/ThemeProvider';

export interface StockIndicatorProps {
  daysOfCover: number;
}

type Level = 'critical' | 'low' | 'ok';

/** Less than one day of cover is low stock (product rule); under three days is a warning. */
function getLevel(days: number): Level {
  if (days < 1) return 'critical';
  if (days < 3) return 'low';
  return 'ok';
}

/**
 * Days-of-cover pill. The level is spoken to screen readers and shown by colour
 * AND by the number itself, never by colour alone.
 */
export function StockIndicator({ daysOfCover }: StockIndicatorProps) {
  const { t, i18n } = useTranslation();
  const tokens = useTheme();

  if (!Number.isFinite(daysOfCover)) {
    return (
      <View style={[styles.container, { borderColor: tokens.border }]} accessible accessibilityLabel={t('stock.noUsageA11y')}>
        <View style={[styles.dot, { backgroundColor: tokens.textMuted }]} />
        <Text style={[styles.days, { color: tokens.textMuted }]}>{t('stock.noUsage')}</Text>
      </View>
    );
  }

  const level = getLevel(daysOfCover);
  const color = level === 'critical' ? tokens.danger : level === 'low' ? tokens.warningText : tokens.link;
  const rounded = Math.round(daysOfCover * 10) / 10;
  const days = formatQuantity(rounded, i18n.language);

  return (
    <View
      style={[styles.container, { borderColor: color }]}
      accessible
      accessibilityLabel={t('stock.coverA11y', { level: t(`stock.level.${level}`), days, count: rounded })}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.days, { color }]}>{days}</Text>
      <Text style={[styles.unit, { color: tokens.textMuted }]}>{t('stock.daysUnit', { count: rounded })}</Text>
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
  dot: { width: 6, height: 6, borderRadius: 3 },
  days: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  unit: { fontSize: fontSize.xs },
});
