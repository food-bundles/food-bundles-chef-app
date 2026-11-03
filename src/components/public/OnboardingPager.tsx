import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { duration, space, useTheme } from '@/theme';

export interface OnboardingPagerProps {
  count: number;
  activeIndex: number;
}

interface DotProps {
  active: boolean;
}

function Dot({ active }: DotProps) {
  const { colors } = useTheme();
  const style = useAnimatedStyle(() => ({
    width: withTiming(active ? 18 : 6, { duration: duration.tint }),
    backgroundColor: withTiming(active ? colors.leaf : colors.disabledLine, { duration: duration.tint }),
  }));

  return <Animated.View style={[styles.dot, style]} />;
}

/** Dot-indicator row showing progress through the onboarding slides. */
export function OnboardingPager({ count, activeIndex }: OnboardingPagerProps) {
  return (
    <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: count }).map((_, index) => (
        <Dot key={index} active={index === activeIndex} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: space.xs },
  dot: { height: 6, borderRadius: 3 },
});
