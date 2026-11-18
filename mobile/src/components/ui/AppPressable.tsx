import { useState } from 'react';
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

export type AppPressableStyle =
  | StyleProp<ViewStyle>
  | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);

export interface AppPressableProps extends Omit<PressableProps, 'style'> {
  style?: AppPressableStyle;
}

/**
 * Pressable that accepts a `({ pressed }) => style` function safely.
 * NativeWind's cssInterop owns Pressable's `style` prop and silently drops
 * function styles, so the pressed state is tracked here and a plain style is passed down.
 */
export function AppPressable({ style, onPressIn, onPressOut, ...rest }: AppPressableProps) {
  const [pressed, setPressed] = useState(false);
  const resolved = typeof style === 'function' ? style({ pressed }) : style;

  return (
    <Pressable
      {...rest}
      style={resolved}
      onPressIn={(e: GestureResponderEvent) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        setPressed(false);
        onPressOut?.(e);
      }}
    />
  );
}
