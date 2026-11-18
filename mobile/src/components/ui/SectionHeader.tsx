import { View, Text, Pressable, StyleSheet } from 'react-native';
import { spacing, fontSize, fontWeight } from '@/lib/theme';
import { useTheme } from '@/providers/ThemeProvider';

export interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  const tokens = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.title, { color: tokens.textMuted }]}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={8}
        >
          <Text style={[styles.action, { color: tokens.link }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  title: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  action: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});
