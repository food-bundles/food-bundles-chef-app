import { View, StyleSheet, type ViewStyle } from 'react-native';
import { colors, radius } from '@/lib/theme';

export interface LoadingSkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  style?: ViewStyle;
  rounded?: boolean;
}

/** Skeleton loading placeholder — single unanimated bar for reduced-motion compatibility */
export function LoadingSkeleton({ width = '100%', height = 20, style, rounded = false }: LoadingSkeletonProps) {
  return (
    <View
      style={[
        styles.skeleton,
        { width, height, borderRadius: rounded ? height / 2 : radius.sm },
        style,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

/** Multi-line skeleton for card loading */
export function CardSkeleton() {
  return (
    <View style={styles.card}>
      <LoadingSkeleton width="60%" height={16} />
      <LoadingSkeleton width="90%" height={13} style={{ marginTop: 8 }} />
      <LoadingSkeleton width="40%" height={13} style={{ marginTop: 6 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.surface[700],
    overflow: 'hidden',
  },
  card: {
    backgroundColor: colors.surface[800],
    borderRadius: radius.lg,
    padding: 16,
    gap: 0,
  },
});
