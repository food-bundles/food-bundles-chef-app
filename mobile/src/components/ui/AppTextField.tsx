import { View, Text, TextInput, StyleSheet, type KeyboardTypeOptions, type TextInputProps } from 'react-native';
import { colors, radius, spacing, fontSize, fontWeight } from '@/lib/theme';

export interface AppTextFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  error?: string;
  keyboardType?: KeyboardTypeOptions;
  autoFocus?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  secureTextEntry?: boolean;
  maxLength?: number;
  accessibilityLabel?: string;
  editable?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  returnKeyType?: TextInputProps['returnKeyType'];
  inputProps?: Omit<TextInputProps, 'value' | 'onChangeText' | 'keyboardType' | 'placeholder' | 'accessibilityLabel'>;
}

/**
 * Labeled text input with inline error display.
 * Designed for native keyboard interaction — no web-specific attributes.
 */
export function AppTextField({
  label,
  value,
  onChangeText,
  onBlur,
  placeholder,
  error,
  keyboardType = 'default',
  autoFocus = false,
  autoCapitalize = 'sentences',
  secureTextEntry = false,
  maxLength,
  accessibilityLabel,
  editable = true,
  multiline = false,
  numberOfLines,
  returnKeyType,
  inputProps,
}: AppTextFieldProps) {
  const hasError = Boolean(error);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.surface[600]}
        keyboardType={keyboardType}
        autoFocus={autoFocus}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
        maxLength={maxLength}
        editable={editable}
        multiline={multiline}
        numberOfLines={numberOfLines}
        onBlur={onBlur}
        returnKeyType={returnKeyType}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: !editable }}
        style={[styles.input, hasError && styles.inputError, multiline && styles.multiline]}
        {...inputProps}
      />
      {hasError && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: {
    color: colors.surface[400],
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: colors.surface[800],
    color: colors.white,
    fontSize: fontSize.base,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderWidth: 1.5,
    borderColor: colors.surface[700],
    minHeight: 48,
  },
  inputError: { borderColor: colors.danger },
  multiline: { minHeight: 80, textAlignVertical: 'top', paddingTop: spacing.sm + 4 },
  error: { color: colors.danger, fontSize: fontSize.xs },
});
