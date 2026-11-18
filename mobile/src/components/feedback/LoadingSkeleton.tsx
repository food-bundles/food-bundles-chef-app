import { View, StyleSheet, type ViewStyle } from 'react-native';
import { radius } from '@/lib/theme';
import { useTheme } from '@/providers/ThemeProvider';

export interface LoadingSkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  style?: ViewStyle;
  rounded?: boolean;
}

/** Skeleton loading placeholder — single unanimated bar for reduced-motion compatibility */
export function LoadingSkeleton({ width = '100%', height = 20, style, rounded = false }: LoadingSkeletonProps) {
  const tokens = useTheme();
  return (
    <View
      style={[
        styles.skeleton,
        { width, height, borderRadius: rounded ? height / 2 : radius.sm, backgroundColor: tokens.border },
        style,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

/** Multi-line skeleton for card loading */
export function CardSkeleton() {
  const tokens = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: tokens.surfaceRaised, borderColor: tokens.border }]}>
      <LoadingSkeleton width="60%" height={16} />
      <LoadingSkeleton width="90%" height={13} style={{ marginTop: 8 }} />
      <LoadingSkeleton width="40%" height={13} style={{ marginTop: 6 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 16,
  },
});
