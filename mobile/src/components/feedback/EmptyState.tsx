import { View, Text, StyleSheet } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { colors, fontSize, fontWeight, spacing } from '@/lib/theme';

export interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Accessible empty state component with optional CTA */
export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container} accessibilityRole="text">
      <Text style={styles.title}>{title}</Text>
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
  },
  title: {
    color: colors.surface[300],
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    color: colors.surface[500],
    fontSize: fontSize.base,
    textAlign: 'center',
    lineHeight: 22,
  },
  action: { marginTop: spacing.lg },
});
