import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { AppButton } from '@/components/ui/AppButton';
import { colors, fontSize, fontWeight, spacing } from '@/lib/theme';

export interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  Icon?: LucideIcon;
}

/** Accessible empty state component with optional icon and CTA */
export function EmptyState({ title, description, actionLabel, onAction, Icon }: EmptyStateProps) {
  const isDark = useColorScheme() === 'dark';
  return (
    <View style={styles.container} accessibilityRole="text">
      {Icon ? (
        <View style={[styles.iconWrap, { backgroundColor: isDark ? colors.surface[800] : colors.surface[100] }]}>
          <Icon size={32} color={colors.brand[500]} strokeWidth={1.5} />
        </View>
      ) : null}
      <Text style={[styles.title, { color: isDark ? colors.surface[300] : colors.surface[700] }]}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <AppButton label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['2xl'],
    gap: spacing.sm,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  description: {
    color: colors.surface[500],
    fontSize: fontSize.base,
    textAlign: 'center',
    lineHeight: 22,
  },
  action: { marginTop: spacing.sm, width: '100%' },
});
