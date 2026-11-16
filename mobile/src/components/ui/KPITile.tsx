import { Pressable, View, Text, StyleSheet, useColorScheme } from 'react-native';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '@/lib/theme';

export type KPIColor = 'green' | 'amber' | 'red' | 'blue' | 'neutral';
export type KPITrend = 'up' | 'down' | 'flat';

export interface KPITileProps {
  value: string | number;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  color: KPIColor;
  trend?: KPITrend;
  onPress?: () => void;
  isLive?: boolean;
}

const COLOR_MAP: Record<KPIColor, { tint: string; icon: string }> = {
  green:   { tint: colors.brand[50],              icon: colors.brand[500] },
  amber:   { tint: colors.warning + '33',         icon: colors.warning },
  red:     { tint: colors.danger + '33',          icon: colors.danger },
  blue:    { tint: colors.info + '33',            icon: colors.info },
  neutral: { tint: 'transparent',                 icon: colors.surface[500] },
};

export function KPITile({
  value,
  label,
  sublabel,
  icon,
  color,
  trend,
  onPress,
  isLive = false,
}: KPITileProps) {
  const isDark = useColorScheme() === 'dark';
  const bgCard = isDark ? colors.surface[800] : colors.surface[100];
  const textPrimary = isDark ? colors.white : colors.surface[900];
  const textMuted = isDark ? colors.surface[500] : colors.surface[500];
  const { tint, icon: iconColor } = COLOR_MAP[color];

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? colors.brand[500] : trend === 'down' ? colors.danger : colors.surface[500];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={`${label}: ${value}${sublabel ? ', ' + sublabel : ''}`}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: bgCard },
        pressed && onPress && styles.pressed,
      ]}
    >
      <View style={styles.header}>
        {isLive && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
        <View style={[styles.iconCircle, { backgroundColor: tint }]}>
          {icon}
        </View>
      </View>

      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: textPrimary }]} numberOfLines={1}>
          {value}
        </Text>
        {trend && (
          <TrendIcon size={14} color={trendColor} />
        )}
      </View>

      <Text style={[styles.label, { color: textMuted }]} numberOfLines={1}>{label}</Text>
      {sublabel && (
        <Text style={[styles.sublabel, { color: textMuted }]} numberOfLines={1}>{sublabel}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brand[500],
  },
  liveText: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    color: colors.brand[500],
    letterSpacing: 0.5,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  value: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sublabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.regular,
  },
  pressed: { opacity: 0.75 },
});
