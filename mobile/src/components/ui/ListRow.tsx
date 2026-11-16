import { Pressable, View, Text, StyleSheet, useColorScheme } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, MIN_TOUCH_SIZE, radius } from '@/lib/theme';

export interface ListRowProps {
  icon?: React.ReactNode;
  iconBg?: string;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  separator?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function ListRow({
  icon,
  iconBg,
  title,
  subtitle,
  trailing,
  onPress,
  destructive = false,
  disabled = false,
  separator = true,
  accessibilityLabel,
  accessibilityHint,
}: ListRowProps) {
  const isDark = useColorScheme() === 'dark';
  const textPrimary = isDark ? colors.white : colors.surface[900];
  const textSecondary = isDark ? colors.surface[400] : colors.surface[600];
  const borderColor = isDark ? colors.surface[700] : colors.surface[200];
  const titleColor = destructive ? colors.danger : textPrimary;

  const showChevron = onPress && !trailing;

  return (
    <Pressable
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
        <Text
          style={[styles.title, { color: titleColor }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: textSecondary }]} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>

      {trailing ?? (showChevron ? (
        <ChevronRight size={16} color={textSecondary} />
      ) : null)}
    </Pressable>
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
  title: {
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
