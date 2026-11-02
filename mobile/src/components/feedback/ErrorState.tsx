import { View, Text, StyleSheet } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { colors, fontSize, fontWeight, spacing } from '@/lib/theme';

export interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

/** Full-screen error state with optional retry action */
export function ErrorState({ message, onRetry, retryLabel = 'Retry' }: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon} accessibilityElementsHidden>⚠</Text>
      <Text style={styles.message} accessibilityRole="alert">{message}</Text>
      {onRetry ? (
        <View style={styles.action}>
          <AppButton label={retryLabel} onPress={onRetry} variant="secondary" />
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
  },
  icon: { fontSize: 36, marginBottom: spacing.md },
  message: {
    color: colors.danger,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
    lineHeight: 22,
  },
  action: { marginTop: spacing.lg },
});
