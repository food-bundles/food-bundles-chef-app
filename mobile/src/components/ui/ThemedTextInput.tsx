import { TextInput } from 'react-native';
import type { ComponentProps } from 'react';
import { useTheme } from '@/providers/ThemeProvider';

export type ThemedTextInputProps = ComponentProps<typeof TextInput>;

/** TextInput whose keyboard and placeholder follow the in-app theme (not just the device). */
export function ThemedTextInput({ keyboardAppearance, placeholderTextColor, ...rest }: ThemedTextInputProps) {
  const tokens = useTheme();
  return (
    <TextInput
      keyboardAppearance={keyboardAppearance ?? tokens.scheme}
      placeholderTextColor={placeholderTextColor ?? tokens.placeholder}
      {...rest}
    />
  );
}
