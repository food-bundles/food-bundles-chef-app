import { View, Text, TextInput, StyleSheet, type KeyboardTypeOptions, type TextInputProps } from 'react-native';
import { radius, spacing, fontSize, fontWeight } from '@/lib/theme';
import { useTheme } from '@/providers/ThemeProvider';

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
  prefix?: string;
  suffix?: string;
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
  prefix,
  suffix,
  inputProps,
}: AppTextFieldProps) {
  const hasError = Boolean(error);
  const tokens = useTheme();
  const adornmentColor = tokens.textMuted;
  const borderColor = hasError ? tokens.danger : tokens.border;
  const bgColor = tokens.surfaceRaised;
  const textColor = tokens.text;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: tokens.textMuted }]}>{label}</Text>
      <View style={[styles.inputRow, { backgroundColor: bgColor, borderColor }]}>
        {prefix && (
          <Text style={[styles.adornment, { color: adornmentColor }]}>{prefix}</Text>
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={tokens.placeholder}
          keyboardAppearance={tokens.scheme}
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
          style={[
            styles.input,
            { color: textColor },
            multiline && styles.multiline,
          ]}
          {...inputProps}
        />
        {suffix && (
          <Text style={[styles.adornment, { color: adornmentColor }]}>{suffix}</Text>
        )}
      </View>
      {hasError && <Text style={[styles.error, { color: tokens.danger }]} accessibilityRole="alert">{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    fontSize: fontSize.base,
    letterSpacing: 0,
    paddingVertical: spacing.sm + 4,
  },
  adornment: {
    fontSize: fontSize.base,
    flexShrink: 0,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top', paddingTop: spacing.sm + 4 },
  error: { fontSize: fontSize.xs },
});
