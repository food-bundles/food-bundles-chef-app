import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { space } from '@/theme';

const BAR_COUNT = 24;
const TICK_MS = 260;

function WaveBar({ index, color }: { index: number; color: string }) {
  const height = useSharedValue(6);

  useEffect(() => {
    const interval = setInterval(() => {
      height.value = withTiming(6 + Math.random() * 26, { duration: TICK_MS });
    }, TICK_MS);
    const stagger = setTimeout(() => {
      height.value = withTiming(6 + Math.random() * 26, { duration: TICK_MS });
    }, index * 15);
    return () => {
      clearInterval(interval);
      clearTimeout(stagger);
      cancelAnimation(height);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({ height: height.value }));

  return <Animated.View style={[styles.bar, { backgroundColor: color }, animatedStyle]} />;
}

/** Reanimated-driven bars with randomized jitter to feel like a live audio waveform — not real audio analysis. */
export function CallWaveform({ tint }: { tint: string }) {
  return (
    <View style={styles.row}>
      {Array.from({ length: BAR_COUNT }, (_, index) => (
        <WaveBar key={index} index={index} color={tint} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 40, marginTop: space.lg },
  bar: { width: 3, borderRadius: 1.5 },
});
