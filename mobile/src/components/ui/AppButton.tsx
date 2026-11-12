import { Pressable, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors, radius, spacing, fontSize, fontWeight, MIN_TOUCH_SIZE } from '@/lib/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

/**
 * Primary action button for the chef app.
 * Respects reduced motion — no animated press feedback beyond opacity.
 */
export function AppButton({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
}: AppButtonProps) {
  const isDisabled = disabled || loading;

  const variantStyle =
    variant === 'primary' ? styles.primary
    : variant === 'secondary' ? styles.secondary
    : variant === 'danger' ? styles.danger
    : styles.ghost;

  const labelStyle =
    variant === 'primary' ? styles.primaryLabel
    : variant === 'secondary' ? styles.secondaryLabel
    : variant === 'danger' ? styles.dangerLabel
    : styles.ghostLabel;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        variantStyle,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.white : '#0E8438'}
        />
      ) : (
        <Text style={[styles.label, labelStyle]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH_SIZE,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    width: '100%',
  },
  primary: {
    backgroundColor: '#0E8438',
    borderWidth: 0,
    shadowColor: '#0E8438',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#0E8438',
  },
  danger: {
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.white,
  },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.75 },
  label: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  primaryLabel: { color: colors.white },
  secondaryLabel: { color: '#0E8438' },
  dangerLabel: { color: colors.white },
  ghostLabel: { color: '#0E8438' },
});
