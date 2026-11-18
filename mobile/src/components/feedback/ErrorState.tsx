import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppButton } from '@/components/ui/AppButton';
import { fontSize, fontWeight, spacing } from '@/lib/theme';
import { useTheme } from '@/providers/ThemeProvider';

export interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

/** Full-screen error state with optional retry action */
export function ErrorState({ message, onRetry, retryLabel }: ErrorStateProps) {
  const tokens = useTheme();
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Text style={styles.icon} accessibilityElementsHidden importantForAccessibility="no">⚠</Text>
      <Text style={[styles.message, { color: tokens.danger }]} accessibilityRole="alert">{message}</Text>
      {onRetry ? (
        <View style={styles.action}>
          <AppButton label={retryLabel ?? t('common.retry')} onPress={onRetry} variant="secondary" />
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
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
    lineHeight: 22,
  },
  action: { marginTop: spacing.lg },
});
