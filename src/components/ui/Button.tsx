import { Pressable, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  label: string;
  variant?: Variant;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export function Button({ label, variant = 'primary', onPress, style, disabled }: ButtonProps) {
  const { colors: palette } = useTheme();

  const bg =
    variant === 'primary' ? palette.pine :
    variant === 'secondary' ? palette.paper :
    'transparent';

  const textColor =
    variant === 'primary' ? palette.onPine :
    variant === 'ghost' ? palette.pine :
    palette.ink;

  const border = variant === 'secondary'
    ? { borderWidth: StyleSheet.hairlineWidth, borderColor: palette.hairline }
    : {};

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.base, { backgroundColor: bg }, border, disabled && styles.disabled, style]}
    >
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 999, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  label: { fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.5 },
});
