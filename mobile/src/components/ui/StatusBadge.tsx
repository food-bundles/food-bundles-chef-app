import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, fontSize, fontWeight, spacing } from '@/lib/theme';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: `${colors.success}1A`, text: colors.success },
  warning: { bg: `${colors.warning}1A`, text: colors.warning },
  danger: { bg: `${colors.danger}1A`, text: colors.danger },
  info: { bg: `${colors.info}1A`, text: colors.info },
  neutral: { bg: colors.surface[700], text: colors.surface[400] },
};

/** Small status pill badge. Does not rely on color alone — label is always visible. */
export function StatusBadge({ label, variant = 'neutral' }: StatusBadgeProps) {
  const vs = VARIANT_STYLES[variant];
  return (
    <View style={[styles.badge, { backgroundColor: vs.bg }]} accessibilityRole="text">
      <Text style={[styles.label, { color: vs.text }]}>{label}</Text>
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
