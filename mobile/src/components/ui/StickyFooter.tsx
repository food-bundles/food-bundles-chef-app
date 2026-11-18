import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@/lib/theme';
import { useTheme } from '@/providers/ThemeProvider';

export interface StickyFooterProps {
  children: React.ReactNode;
  /** Additional gap above children, e.g. for warning banners. Default spacing.md. */
  paddingTop?: number;
}

/** Bottom action area for forms; respects the safe-area inset. */
export function StickyFooter({ children, paddingTop = spacing.md }: StickyFooterProps) {
  const tokens = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.footer,
        {
          backgroundColor: tokens.surface,
          borderTopColor: tokens.border,
          paddingTop,
          paddingBottom: Math.max(insets.bottom + 8, 16),
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
});
