import { useId } from 'react';
import { StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { hit, radius, space, text, useTheme } from '@/theme';
import { InfoCircleIcon } from '@/components/icons';

export interface InputProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string;
  helper?: string;
  /** 'amber' pairs the helper with an info-circle icon for required-later style notices. */
  helperTone?: 'muted' | 'amber';
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  editable?: boolean;
  maxLength?: number;
  rightSlot?: React.ReactNode;
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  helper,
  helperTone = 'muted',
  keyboardType,
  secureTextEntry,
  editable = true,
  maxLength,
  rightSlot,
}: InputProps) {
  const id = useId();
  const { colors } = useTheme();

  return (
    <View>
      <Text style={[styles.label, { color: colors.ink }]} nativeID={id}>
        {label}
      </Text>
      <View
        style={[
          styles.row,
          { borderColor: error ? colors.chili : colors.hairline, backgroundColor: colors.paper },
          !editable && { backgroundColor: colors.neutral },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          editable={editable}
          maxLength={maxLength}
          placeholderTextColor={colors.muted}
          accessibilityLabel={label}
          accessibilityLabelledBy={id}
          style={[styles.input, { color: colors.ink }, !editable && { color: colors.muted }]}
        />
        {rightSlot}
      </View>
      {error ? (
        <Text style={[styles.errorText, { color: colors.chili }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : helper ? (
        <View style={styles.helperRow}>
          {helperTone === 'amber' ? <InfoCircleIcon size={14} /> : null}
          <Text style={[styles.helperText, { color: helperTone === 'amber' ? colors.tintedAmberText : colors.muted }]}>
            {helper}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...text.label, marginBottom: space.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: hit.min,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
  },
  input: { ...text.body, flex: 1, paddingVertical: space.sm },
  errorText: { ...text.caption, marginTop: space.xs },
  helperRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xs, marginTop: space.xs },
  helperText: { ...text.caption, flex: 1 },
});
