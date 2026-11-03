import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { duration, useTheme } from '@/theme';

/**
 * Sits above the app and briefly cross-fades the outgoing background colour over the new
 * one whenever the resolved palette changes (Light/Dark/System toggle, or the system
 * scheme itself flipping) — the underlying screens still swap colours instantly, but this
 * overlay makes that swap read as a smooth transition instead of a hard cut.
 */
export function ThemeTransitionOverlay() {
  const { colors, isDark } = useTheme();
  const opacity = useSharedValue(0);
  const isDarkRef = useRef(isDark);
  const [overlayColor, setOverlayColor] = useState(colors.oat);

  useEffect(() => {
    if (isDarkRef.current === isDark) return;
    isDarkRef.current = isDark;
    // overlayColor still holds the outgoing palette's background at this point — paint it
    // fully opaque over the newly-applied colours, then fade it away to reveal them.
    opacity.value = 1;
    opacity.value = withTiming(0, { duration: duration.overlay });
    const timer = setTimeout(() => setOverlayColor(colors.oat), duration.overlay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: overlayColor }, animatedStyle]}
    />
  );
}
