import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { radius, spacing } from '@/lib/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useTheme } from '@/providers/ThemeProvider';

export interface SkeletonRowProps {
  /** Show a leading square (icon placeholder) */
  showIcon?: boolean;
  /** Show a short trailing element */
  showTrailing?: boolean;
  /** Width of the subtitle line as a fraction of the title width (0–1) */
  subtitleWidth?: number;
}

/** Pulsing placeholder for a list row while it loads (static when Reduce Motion is on). */
export function SkeletonRow({ showIcon = true, showTrailing = false, subtitleWidth = 0.6 }: SkeletonRowProps) {
  const tokens = useTheme();
  const reduceMotion = useReduceMotion();
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, reduceMotion]);

  const opacity = reduceMotion ? 1 : anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] });
  const subtitlePercent = `${Math.round(Math.min(1, Math.max(0, subtitleWidth)) * 100)}%` as const;

  return (
    <Animated.View
      style={[styles.row, { opacity }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {showIcon && <View style={[styles.icon, { backgroundColor: tokens.surfaceSunken }]} />}
      <View style={styles.textBlock}>
        <View style={[styles.title, { backgroundColor: tokens.surfaceSunken }]} />
        <View style={[styles.subtitle, { backgroundColor: tokens.border, width: subtitlePercent }]} />
      </View>
      {showTrailing && <View style={[styles.trailing, { backgroundColor: tokens.surfaceSunken }]} />}
    </Animated.View>
  );
}

/** Renders `count` skeleton rows, useful while a list loads. */
export function SkeletonList({ count = 4, ...props }: SkeletonRowProps & { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonRow key={i} {...props} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 14, gap: 12 },
  icon: { width: 36, height: 36, borderRadius: radius.md, flexShrink: 0 },
  textBlock: { flex: 1, gap: 6 },
  title: { height: 14, borderRadius: radius.sm, width: '70%' },
  subtitle: { height: 11, borderRadius: radius.sm },
  trailing: { width: 48, height: 22, borderRadius: radius.sm, flexShrink: 0 },
});
