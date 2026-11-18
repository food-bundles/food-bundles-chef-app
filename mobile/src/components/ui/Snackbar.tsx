import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppPressable } from './AppPressable';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, fontSize, fontWeight, radius, spacing } from '@/lib/theme';

export interface SnackbarProps {
  visible: boolean;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
  duration?: number;
}

/**
 * Short confirmation at the bottom of the screen with an optional action (Undo).
 * Inverse surface (dark in both themes) so it stands out from the page.
 */
export function Snackbar({ visible, message, actionLabel, onAction, onDismiss, duration = 4000 }: SnackbarProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const [translateY] = useState(() => new Animated.Value(100));
  const [opacity] = useState(() => new Animated.Value(0));
  // Latest callback without restarting the timer when the parent re-renders.
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!visible) {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 100, duration: reduceMotion ? 0 : 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: reduceMotion ? 0 : 200, useNativeDriver: true }),
      ]).start();
      return;
    }
    Animated.parallel([
      reduceMotion
        ? Animated.timing(translateY, { toValue: 0, duration: 0, useNativeDriver: true })
        : Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }),
      Animated.timing(opacity, { toValue: 1, duration: reduceMotion ? 0 : 150, useNativeDriver: true }),
    ]).start();
    const timer = setTimeout(() => onDismissRef.current(), duration);
    return () => clearTimeout(timer);
  }, [visible, duration, reduceMotion, translateY, opacity]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { bottom: Math.max(insets.bottom + 16, 24), transform: [{ translateY }], opacity },
      ]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Text style={styles.message} numberOfLines={3}>
        {message}
      </Text>
      {actionLabel && onAction ? (
        <AppPressable
          onPress={() => {
            onAction();
            onDismiss();
          }}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={12}
          style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
        >
          <Text style={styles.action}>{actionLabel}</Text>
        </AppPressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    borderRadius: radius.lg,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface[800],
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
  },
  message: { flex: 1, color: colors.white, fontSize: fontSize.sm, fontWeight: fontWeight.medium, paddingVertical: spacing.sm },
  actionButton: { minHeight: 44, minWidth: 44, paddingHorizontal: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
  action: { color: colors.action, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
});
