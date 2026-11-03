import { useAnimatedScrollHandler, useSharedValue, withTiming } from 'react-native-reanimated';
import { duration, hit } from '@/theme';
import { tabBarTranslateY } from '@/stores/tabBarVisibilityStore';

const HIDE_THRESHOLD = 12;
const TAB_BAR_TRAVEL = hit.min + 40;

/**
 * Tracks scroll direction on a Reanimated-driven `ScrollView`/`Animated.ScrollView` and
 * drives the shared bottom-tab-bar translateY: hides on scroll-down past a small
 * threshold, shows on scroll-up or at rest/top. Returns the `onScroll` handler to attach.
 */
export function useHideOnScroll() {
  const lastOffset = useSharedValue(0);
  const accumulatedDelta = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      const currentOffset = Math.max(0, event.contentOffset.y);
      const delta = currentOffset - lastOffset.value;

      if (currentOffset <= 0) {
        tabBarTranslateY.value = withTiming(0, { duration: duration.overlay });
        accumulatedDelta.value = 0;
        lastOffset.value = currentOffset;
        return;
      }

      if (Math.sign(delta) !== Math.sign(accumulatedDelta.value) && delta !== 0) {
        accumulatedDelta.value = 0;
      }
      accumulatedDelta.value += delta;

      if (accumulatedDelta.value > HIDE_THRESHOLD) {
        tabBarTranslateY.value = withTiming(TAB_BAR_TRAVEL, { duration: duration.overlay });
        accumulatedDelta.value = 0;
      } else if (accumulatedDelta.value < -HIDE_THRESHOLD) {
        tabBarTranslateY.value = withTiming(0, { duration: duration.overlay });
        accumulatedDelta.value = 0;
      }

      lastOffset.value = currentOffset;
    },
  });

  return { onScroll };
}
