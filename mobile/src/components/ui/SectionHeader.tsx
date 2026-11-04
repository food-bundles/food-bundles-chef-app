import { View, Text, Pressable, StyleSheet, useColorScheme } from 'react-native';
import { colors, spacing, fontSize, fontWeight } from '@/lib/theme';

export interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  const isDark = useColorScheme() === 'dark';
  return (
    <View style={styles.row}>
      <Text style={[styles.title, { color: isDark ? colors.surface[400] : colors.surface[600] }]}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={8}
        >
          <Text style={styles.action}>{actionLabel}</Text>
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  action: {
    color: colors.brand[400],
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});
