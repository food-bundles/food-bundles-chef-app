import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { signatureDuration, useTheme } from '@/theme';

export interface AvatarFaceProps {
  /** Overall diameter of the face artwork in px. */
  size?: number;
  /** When false, renders a single neutral frame with no loops — for static header use. */
  animated?: boolean;
}

const EYE_RY = 3.4;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

/** FoodBundles AI assistant face: blinking eyes, an idle bob, and a thinking-dots cue. */
export function AvatarFace({ size = 32, animated = true }: AvatarFaceProps) {
  const { colors } = useTheme();
  const eyeScaleY = useSharedValue(1);
  const eyeShiftX = useSharedValue(0);
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);
  const bobY = useSharedValue(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const values = [eyeScaleY, eyeShiftX, dot1, dot2, dot3, bobY];
    if (!animated || reduceMotion) {
      values.forEach(cancelAnimation);
      return;
    }

    eyeScaleY.value = withRepeat(
      withSequence(
        withDelay(signatureDuration.avatarBlinkInterval, withTiming(0.1, { duration: signatureDuration.avatarBlink })),
        withTiming(1, { duration: signatureDuration.avatarBlink }),
      ),
      -1,
      false,
    );
    eyeShiftX.value = withRepeat(
      withSequence(
        withDelay(
          signatureDuration.avatarEyeShiftInterval,
          withTiming(2, { duration: signatureDuration.avatarEyeShift, easing: Easing.inOut(Easing.ease) }),
        ),
        withTiming(-2, { duration: signatureDuration.avatarEyeShift, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: signatureDuration.avatarEyeShift, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    const stagger = signatureDuration.avatarThinkingDotStagger;
    [dot1, dot2, dot3].forEach((dot, index) => {
      dot.value = withRepeat(
        withSequence(
          withDelay(signatureDuration.avatarThinkingInterval + index * stagger, withTiming(1, { duration: stagger })),
          withTiming(0, { duration: stagger }),
        ),
        -1,
        false,
      );
    });
    bobY.value = withRepeat(
      withSequence(
        withTiming(-2, { duration: signatureDuration.avatarIdleBob / 2, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: signatureDuration.avatarIdleBob / 2, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );

    return () => values.forEach(cancelAnimation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animated, reduceMotion]);

  const bodyStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bobY.value }] }));
  const leftEyeProps = useAnimatedProps(() => ({ cx: 16 - 7 + eyeShiftX.value, ry: EYE_RY * eyeScaleY.value }));
  const rightEyeProps = useAnimatedProps(() => ({ cx: 16 + 7 + eyeShiftX.value, ry: EYE_RY * eyeScaleY.value }));
  const dot1Props = useAnimatedProps(() => ({ opacity: dot1.value }));
  const dot2Props = useAnimatedProps(() => ({ opacity: dot2.value }));
  const dot3Props = useAnimatedProps(() => ({ opacity: dot3.value }));

  return (
    <Animated.View style={[{ width: size, height: size }, bodyStyle]}>
      <Svg width={size} height={size} viewBox="0 0 32 32">
        <AnimatedCircle cx={11} cy={7} r={1.1} fill={colors.paper} animatedProps={dot1Props} />
        <AnimatedCircle cx={16} cy={6} r={1.1} fill={colors.paper} animatedProps={dot2Props} />
        <AnimatedCircle cx={21} cy={7} r={1.1} fill={colors.paper} animatedProps={dot3Props} />
        <AnimatedEllipse cy={14} rx={EYE_RY} ry={EYE_RY} fill={colors.paper} animatedProps={leftEyeProps} />
        <AnimatedEllipse cy={14} rx={EYE_RY} ry={EYE_RY} fill={colors.paper} animatedProps={rightEyeProps} />
        <Path d="M12 21 Q16 24 20 21" stroke={colors.paper} strokeWidth={1.8} strokeLinecap="round" fill="none" />
      </Svg>
    </Animated.View>
  );
}
