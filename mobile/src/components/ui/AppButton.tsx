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
        styles[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.black : colors.brand[500]}
        />
      ) : (
        <Text style={[styles.label, styles[`${variant}Label`]]}>{label}</Text>
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
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.brand[500],
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
  primaryLabel: { color: colors.black },
  secondaryLabel: { color: colors.brand[500] },
  dangerLabel: { color: colors.white },
  ghostLabel: { color: colors.brand[500] },
});
