import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { AppPressable } from './AppPressable';
import { ChevronRight } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, MIN_TOUCH_SIZE, radius } from '@/lib/theme';
import { useTheme } from '@/providers/ThemeProvider';

export interface ListRowProps {
  icon?: React.ReactNode;
  iconBg?: string;
  title: string;
  /** Rendered inline after the title, e.g. an ACTIVE badge. */
  titleAccessory?: React.ReactNode;
  subtitle?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  separator?: boolean;
  /** Show the trailing chevron on pressable rows without a `trailing` element. Default true. */
  chevron?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function ListRow({
  icon,
  iconBg,
  title,
  titleAccessory,
  subtitle,
  trailing,
  onPress,
  destructive = false,
  disabled = false,
  separator = true,
  chevron = true,
  accessibilityLabel,
  accessibilityHint,
}: ListRowProps) {
  const isDark = useColorScheme() === 'dark';
  const textPrimary = isDark ? colors.white : colors.surface[900];
  const textSecondary = isDark ? colors.surface[400] : colors.surface[600];
  const borderColor = isDark ? colors.surface[700] : colors.surface[200];
  const tokens = useTheme();
  const titleColor = destructive ? tokens.danger : textPrimary;

  const showChevron = chevron && onPress && trailing == null;

  return (
    <AppPressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.row,
        separator && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: borderColor },
        disabled && styles.disabled,
        pressed && !disabled && onPress && styles.pressed,
      ]}
    >
      {icon && (
        <View
          style={[
            styles.iconContainer,
            iconBg ? { backgroundColor: iconBg } : {
              backgroundColor: isDark ? colors.surface[700] : colors.surface[200],
            },
          ]}
        >
          {icon}
        </View>
      )}

      <View style={styles.textBlock}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, { color: titleColor }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {titleAccessory}
        </View>
        {subtitle && (
          <Text style={[styles.subtitle, { color: textSecondary }]} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>

      {trailing != null ? (
        <View style={styles.trailing}>{trailing}</View>
      ) : showChevron ? (
        <ChevronRight size={16} color={textSecondary} />
      ) : null}
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    minHeight: MIN_TOUCH_SIZE,
    gap: 12,
  },
  trailing: {
    flexShrink: 0,
    alignSelf: 'center',
    alignItems: 'flex-end',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: fontWeight.semibold,
  },
  subtitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.regular,
  },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
});
