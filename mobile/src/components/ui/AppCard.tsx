import { View, StyleSheet, type ViewStyle } from 'react-native';
import { colors, radius, spacing } from '@/lib/theme';

export interface AppCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Highlight border for selected/active state */
  highlighted?: boolean;
}

/** Standard card container — dark surface with rounded corners */
export function AppCard({ children, style, highlighted = false }: AppCardProps) {
  return (
    <View
      style={[
        styles.card,
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
    backgroundColor: colors.surface[800],
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  highlighted: {
    borderColor: colors.brand[500],
    borderWidth: 1.5,
  },
});
