import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { AppPressable } from './AppPressable';
import { fontSize, fontWeight, spacing, type ThemeTokens } from '@/lib/theme';
import { useTheme } from '@/providers/ThemeProvider';

export type KPIColor = 'green' | 'amber' | 'red' | 'blue' | 'neutral';
export type KPITrend = 'up' | 'down' | 'flat';

export interface KPITileProps {
  value: string | number;
  label: string;
  sublabel?: string;
  icon: ReactNode;
  color: KPIColor;
  trend?: KPITrend;
  onPress?: () => void;
  isLive?: boolean;
}

/** Icon-circle background per semantic colour (red only when something needs action — #17). */
function tintFor(color: KPIColor, tokens: ThemeTokens): string {
  switch (color) {
    case 'green':
      return tokens.primaryTint;
    case 'amber':
      return tokens.warningTint;
    case 'red':
      return tokens.dangerTint;
    case 'blue':
    case 'neutral':
      return tokens.surfaceSunken;
  }
}

/** Dashboard metric card: 40×40 icon circle, value, label, optional context line. */
export function KPITile({ value, label, sublabel, icon, color, trend, onPress, isLive = false }: KPITileProps) {
  const { t } = useTranslation();
  const tokens = useTheme();
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? tokens.link : trend === 'down' ? tokens.danger : tokens.textMuted;

  return (
    <AppPressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={`${label}: ${value}${sublabel ? `, ${sublabel}` : ''}`}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: tokens.surfaceRaised, borderColor: tokens.border, shadowColor: tokens.shadow },
        pressed && onPress && styles.pressed,
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: tintFor(color, tokens) }]}>{icon}</View>
        {isLive && (
          <View style={styles.liveBadge}>
            <View style={[styles.liveDot, { backgroundColor: tokens.link }]} />
            <Text style={[styles.liveText, { color: tokens.link }]}>{t('dashboard.live')}</Text>
          </View>
        )}
      </View>

      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: tokens.text }]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        {trend && <TrendIcon size={14} color={trendColor} />}
      </View>

      <Text style={[styles.label, { color: tokens.textMuted }]} numberOfLines={2}>
        {label}
      </Text>
      {sublabel ? (
        <Text style={[styles.sublabel, { color: tokens.textMuted }]} numberOfLines={2}>
          {sublabel}
        </Text>
      ) : null}
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, letterSpacing: 0.5 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  value: { fontSize: fontSize['2xl'], fontWeight: '800', letterSpacing: -0.5 },
  label: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  sublabel: { fontSize: fontSize.xs, fontWeight: fontWeight.regular },
  pressed: { opacity: 0.75 },
});
