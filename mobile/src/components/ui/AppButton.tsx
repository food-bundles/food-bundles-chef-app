import { Text, ActivityIndicator, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { AppPressable } from './AppPressable';
import { spacing, fontSize, fontWeight, MIN_TOUCH_SIZE, type ThemeTokens } from '@/lib/theme';
import { useTheme } from '@/providers/ThemeProvider';

export type ButtonVariant = 'primary' | 'action' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'md' | 'lg';

export interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** Optional icon before the label (decorative: the label names the action). */
  icon?: LucideIcon;
}

function variantColors(variant: ButtonVariant, t: ThemeTokens) {
  // Outline/ghost text uses the tint text colour in dark mode — primary green on dark fails AA.
  const outlineText = t.scheme === 'dark' ? t.onPrimaryTint : t.primary;
  switch (variant) {
    case 'primary':
      return { bg: t.primary, border: t.primary, text: t.onPrimary };
    case 'action':
      return { bg: t.action, border: t.action, text: t.onAction };
    case 'danger':
      return { bg: t.danger, border: t.danger, text: t.onDanger };
    case 'secondary':
      return { bg: 'transparent', border: outlineText, text: outlineText };
    case 'ghost':
      return { bg: 'transparent', border: 'transparent', text: outlineText };
  }
}

/**
 * Button for every in-screen action. `action` is the bright green used in the
 * sticky footer and keyboard action bar; `primary` is the deep brand green.
 */
export function AppButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  icon: Icon,
}: AppButtonProps) {
  const tokens = useTheme();
  const isDisabled = disabled || loading;
  const c = variantColors(variant, tokens);
  const filled = variant === 'primary' || variant === 'action' || variant === 'danger';

  return (
    <AppPressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' && styles.sizeLg,
        { backgroundColor: c.bg, borderColor: c.border },
        filled && { shadowColor: tokens.actionShadow, shadowOpacity: tokens.actionShadowOpacity, ...styles.shadow },
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={c.text} />
      ) : (
        <>
          {Icon ? <Icon size={20} color={c.text} strokeWidth={2.25} style={styles.icon} /> : null}
          <Text style={[styles.label, size === 'lg' && styles.labelLg, { color: c.text }]}>{label}</Text>
        </>
      )}
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH_SIZE,
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md - 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    width: '100%',
  },
  sizeLg: {
    paddingVertical: 16,
    minHeight: 56,
  },
  shadow: {
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.75 },
  label: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  labelLg: {
    fontSize: fontSize.lg,
  },
  icon: { marginRight: spacing.sm },
});
