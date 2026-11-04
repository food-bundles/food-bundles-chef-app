import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { colors, radius, fontSize, fontWeight, spacing } from '@/lib/theme';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const SEMANTIC_VARIANTS: Record<Exclude<BadgeVariant, 'neutral'>, { bg: string; text: string }> = {
  success: { bg: `${colors.success}1A`, text: colors.success },
  warning: { bg: `${colors.warning}1A`, text: colors.warning },
  danger: { bg: `${colors.danger}1A`, text: colors.danger },
  info: { bg: `${colors.info}1A`, text: colors.info },
};

/** Small status pill badge. Does not rely on color alone — label is always visible. */
export function StatusBadge({ label, variant = 'neutral' }: StatusBadgeProps) {
  const isDark = useColorScheme() === 'dark';
  const bg = variant === 'neutral'
    ? (isDark ? colors.surface[700] : colors.surface[200])
    : SEMANTIC_VARIANTS[variant].bg;
  const text = variant === 'neutral'
    ? (isDark ? colors.surface[400] : colors.surface[600])
    : SEMANTIC_VARIANTS[variant].text;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]} accessibilityRole="text">
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
});
