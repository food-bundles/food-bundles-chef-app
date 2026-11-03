import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { type AnimatedScrollViewProps } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space, useTheme } from '@/theme';

export interface ScreenScrollProps {
  contentInsetBottom?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Set to false when a header above already consumes the top safe-area inset */
  applyTopInset?: boolean;
  /** Reanimated scroll handler from useHideOnScroll, for screens that drive the tab bar's hide/show. */
  onScroll?: AnimatedScrollViewProps['onScroll'];
  children: React.ReactNode;
}

export function ScreenScroll({
  contentInsetBottom = 0,
  contentContainerStyle,
  applyTopInset = true,
  onScroll,
  children,
}: ScreenScrollProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <Animated.ScrollView
      style={[styles.container, { backgroundColor: colors.oat }]}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={onScroll ? 16 : undefined}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: applyTopInset ? insets.top : 0,
          paddingBottom: contentInsetBottom + space.lg,
        },
        contentContainerStyle,
      ]}
    >
      {children}
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: space.lg },
});
