import { useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type GestureResponderEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { duration, radius, text, useTheme, type ColorPalette } from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'destructive';
export type ButtonSize = 'md' | 'sm';

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  onPress: () => void;
  children: string;
  accessibilityLabel?: string;
}

const VARIANT_BG: Record<ButtonVariant, keyof ColorPalette> = {
  primary: 'leaf',
  secondary: 'paper',
  accent: 'marigold',
  destructive: 'chili',
};

const VARIANT_TEXT: Record<ButtonVariant, keyof ColorPalette> = {
  primary: 'paper',
  secondary: 'ink',
  accent: 'pine',
  destructive: 'paper',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  onPress,
  children,
  accessibilityLabel,
}: ButtonProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const isDisabled = disabled || loading;

  const onPressIn = useCallback(() => {
    scale.value = withTiming(0.98, { duration: duration.press });
  }, [scale]);

  const onPressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: duration.press });
  }, [scale]);

  const handlePress = useCallback(
    (_event: GestureResponderEvent) => {
      if (!isDisabled) onPress();
    },
    [isDisabled, onPress],
  );

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const textColor = colors[VARIANT_TEXT[variant]];

  return (
    <Animated.View style={[fullWidth && styles.fullWidth, animatedStyle]}>
      <Pressable
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? children}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        style={[
          styles.base,
          size === 'md' ? styles.md : styles.sm,
          { backgroundColor: colors[VARIANT_BG[variant]] },
          variant === 'secondary' && [styles.secondaryBorder, { borderColor: colors.hairline }],
          isDisabled && styles.disabled,
          fullWidth && styles.fullWidth,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={textColor} />
        ) : (
          <Text style={[styles.label, { color: textColor }]}>{children}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  md: { minHeight: 48 },
  sm: { minHeight: 44 },
  fullWidth: { width: '100%' },
  secondaryBorder: { borderWidth: 1 },
  disabled: { opacity: 0.5 },
  label: { ...text.bodySemi },
});
