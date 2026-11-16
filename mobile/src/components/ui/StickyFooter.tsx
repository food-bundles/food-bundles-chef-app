import { View, StyleSheet, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@/lib/theme';

export interface StickyFooterProps {
  children: React.ReactNode;
  /** Additional gap above children, e.g. for warning banners. Default spacing.md. */
  paddingTop?: number;
}

/**
 * Sticky footer that sits as the LAST CHILD inside a FormScreen / KAV.
 * On iOS the KAV pushes this above the keyboard. On Android, resize mode handles it.
 * Respects the safe-area bottom inset.
 */
export function StickyFooter({ children, paddingTop = spacing.md }: StickyFooterProps) {
  const isDark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.footer,
        {
          backgroundColor: isDark ? colors.surface[950] : colors.surface[50],
          borderTopColor: isDark ? colors.surface[700] : colors.surface[200],
          paddingTop,
          paddingBottom: Math.max(insets.bottom + 12, 24),
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
});
