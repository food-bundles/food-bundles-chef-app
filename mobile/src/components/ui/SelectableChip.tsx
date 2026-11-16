import { Pressable, Text, StyleSheet, useColorScheme } from 'react-native';
import { colors, fontSize, fontWeight, MIN_TOUCH_SIZE } from '@/lib/theme';

export interface SelectableChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export function SelectableChip({
  label,
  selected,
  onPress,
  disabled = false,
  accessibilityLabel,
}: SelectableChipProps) {
  const isDark = useColorScheme() === 'dark';

  const borderColor = selected
    ? colors.brand[500]
    : isDark ? colors.surface[600] : colors.surface[300];
  const bgColor = selected ? colors.brand[500] : 'transparent';
  const textColor = selected
    ? colors.white
    : isDark ? colors.surface[300] : colors.surface[700];

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="radio"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected, disabled }}
      style={({ pressed }) => [
        styles.chip,
        { borderColor, backgroundColor: bgColor },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    minHeight: MIN_TOUCH_SIZE - 8,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.75 },
});
