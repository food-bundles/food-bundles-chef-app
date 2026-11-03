import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { duration, easing, radius, space, text, useTheme } from '@/theme';
import { useT } from '@/i18n';

export interface SwipeRowProps {
  onDelete: () => void;
  deleteLabel: string;
  children: React.ReactNode;
}

const CLAMP_MIN = -104;
const DELETE_THRESHOLD = -58;

export function SwipeRow({ onDelete, deleteLabel, children }: SwipeRowProps) {
  const t = useT();
  const { colors } = useTheme();
  const translateX = useSharedValue(0);

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      translateX.value = Math.max(CLAMP_MIN, Math.min(0, event.translationX));
    })
    .onEnd(() => {
      if (translateX.value < DELETE_THRESHOLD) {
        translateX.value = 0;
        runOnJS(onDelete)();
      } else {
        translateX.value = withTiming(0, { duration: duration.nav, easing: easing.standard });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.wrapper}>
      <View style={[styles.deleteLayer, { backgroundColor: colors.chili }]}>
        <Pressable
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel={deleteLabel}
          style={styles.deleteButton}
        >
          <Text style={[styles.deleteLabel, { color: colors.paper }]}>{t('action_remove')}</Text>
        </Pressable>
      </View>
      <GestureDetector gesture={pan}>
        <Animated.View style={animatedStyle}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative', overflow: 'hidden', borderRadius: radius.lg, marginBottom: space.sm },
  deleteLayer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  deleteButton: { minHeight: 44, minWidth: 88, alignItems: 'center', justifyContent: 'center', paddingRight: space.lg },
  deleteLabel: { ...text.label },
});
