import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { radius, space, useTheme } from '@/theme';
import { AvatarFace } from '@/components/navigation';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** A small bubble showing the other party's avatar plus three pulsing dots, using AvatarFace's dot-pulse timing. */
export function TypingIndicator() {
  const { colors } = useTheme();
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);

  useEffect(() => {
    const dots = [dot1, dot2, dot3];
    dots.forEach((dot, index) => {
      dot.value = withRepeat(
        withSequence(
          withDelay(index * 150, withTiming(1, { duration: 260 })),
          withTiming(0.3, { duration: 260 }),
        ),
        -1,
        false,
      );
    });
    return () => dots.forEach(cancelAnimation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dot1Props = useAnimatedProps(() => ({ opacity: dot1.value }));
  const dot2Props = useAnimatedProps(() => ({ opacity: dot2.value }));
  const dot3Props = useAnimatedProps(() => ({ opacity: dot3.value }));

  return (
    <View style={styles.row}>
      <View style={[styles.avatarCircle, { backgroundColor: colors.pine }]}>
        <AvatarFace size={20} />
      </View>
      <View style={[styles.bubble, { backgroundColor: colors.paper, borderColor: colors.hairline }]}>
        <Svg width={36} height={12} viewBox="0 0 36 12">
          <AnimatedCircle cx={6} cy={6} r={3} fill={colors.muted} animatedProps={dot1Props} />
          <AnimatedCircle cx={18} cy={6} r={3} fill={colors.muted} animatedProps={dot2Props} />
          <AnimatedCircle cx={30} cy={6} r={3} fill={colors.muted} animatedProps={dot3Props} />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm },
  avatarCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bubble: {
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
});
