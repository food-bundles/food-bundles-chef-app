import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space, useTheme } from '@/theme';

export interface StickyFooterProps {
  children: React.ReactNode;
}

export function StickyFooter({ children }: StickyFooterProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: insets.bottom + space.md, borderTopColor: colors.hairline, backgroundColor: colors.oat },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
  },
});
