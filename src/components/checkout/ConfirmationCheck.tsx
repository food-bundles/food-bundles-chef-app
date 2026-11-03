import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { easing, signatureDuration, useTheme } from '@/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const CHECK_PATH_LENGTH = 20;

export function ConfirmationCheck() {
  const { colors } = useTheme();
  const scale = useSharedValue(0.4);
  const opacity = useSharedValue(0);
  const dashOffset = useSharedValue(CHECK_PATH_LENGTH);

  useEffect(() => {
    scale.value = withDelay(
      signatureDuration.confirmDiscDelay,
      withTiming(1, { duration: signatureDuration.confirmDiscPop, easing: easing.spring }),
    );
    opacity.value = withDelay(
      signatureDuration.confirmDiscDelay,
      withTiming(1, { duration: signatureDuration.confirmFadeIn }),
    );
    dashOffset.value = withDelay(
      signatureDuration.confirmCheckDelay,
      withTiming(0, { duration: signatureDuration.confirmCheckDraw }),
    );
  }, [scale, opacity, dashOffset]);

  const discStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const pathProps = useAnimatedProps(() => ({ strokeDashoffset: dashOffset.value }));

  return (
    <Animated.View style={[styles.disc, { backgroundColor: colors.ripe }, discStyle]}>
      <Svg viewBox="0 0 24 24" width={28} height={28} fill="none">
        <AnimatedPath
          d="M20 6 9 17l-5-5"
          stroke={colors.paper}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={CHECK_PATH_LENGTH}
          animatedProps={pathProps}
        />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  disc: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
});
