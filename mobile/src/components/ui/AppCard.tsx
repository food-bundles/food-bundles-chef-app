import { View, StyleSheet, type ViewStyle } from 'react-native';
import { radius, spacing } from '@/lib/theme';
import { useTheme } from '@/providers/ThemeProvider';

export interface AppCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Highlight border for selected/active state */
  highlighted?: boolean;
}

/** Standard raised card for the active theme. */
export function AppCard({ children, style, highlighted = false }: AppCardProps) {
  const tokens = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: tokens.surfaceRaised, borderColor: highlighted ? tokens.primary : tokens.border },
        highlighted && styles.highlighted,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
  },
  highlighted: {
    borderWidth: 1.5,
  },
});
