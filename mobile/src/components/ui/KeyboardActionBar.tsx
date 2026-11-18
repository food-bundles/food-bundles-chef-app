import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { FormActionRow, type FormAction } from './FormActionButton';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useTheme } from '@/providers/ThemeProvider';

export interface KeyboardActionBarProps {
  actions: FormAction[];
  /** Whether the keyboard is open — the bar is only shown while typing. */
  visible: boolean;
  /** Extra space above the bar (safe-area top on screens without a header). */
  topInset?: number;
}

const BAR_BLOCK = 48 + 16;
const DURATION_MS = 180;

/**
 * Pinned at the TOP of the form (directly under the header) while the keyboard is
 * open, so Save / Create / Update / Remove stay reachable without dismissing it.
 * Animates its height with the keyboard (≤200ms, instant with Reduce Motion).
 */
export function KeyboardActionBar({ actions, visible, topInset = 0 }: KeyboardActionBarProps) {
  const tokens = useTheme();
  const reduceMotion = useReduceMotion();
  // Created once; an Animated.Value is driven by the animation, not by React state updates.
  const [progress] = useState(() => new Animated.Value(visible ? 1 : 0));

  useEffect(() => {
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: reduceMotion ? 0 : DURATION_MS,
      useNativeDriver: false,
    }).start();
  }, [visible, reduceMotion, progress]);

  const height = progress.interpolate({ inputRange: [0, 1], outputRange: [0, BAR_BLOCK + topInset] });

  return (
    <Animated.View
      style={[styles.container, { height, opacity: progress, backgroundColor: tokens.surface }]}
      pointerEvents={visible ? 'box-none' : 'none'}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
    >
      <View style={[styles.inner, { paddingTop: 8 + topInset }]}>
        <FormActionRow actions={actions} placement="bar" />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 10,
  },
  inner: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
