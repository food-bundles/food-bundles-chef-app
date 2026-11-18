import { useCallback, useEffect, useRef, useState, type ComponentRef, type RefObject } from 'react';
import {
  Keyboard,
  LayoutAnimation,
  Platform,
  type KeyboardEvent,
  type LayoutChangeEvent,
  type View,
} from 'react-native';

/**
 * How much of a view the software keyboard covers, in points — apply it as
 * `paddingBottom` so the view's bottom content (a chat composer, a footer) sits
 * right above the keyboard.
 *
 * It measures the view's real position on screen, so it is correct under a tab bar
 * or header, inside modals, and whether or not Android resizes the window (when the
 * window shrinks, the overlap is simply 0). Re-measures when the view's own layout
 * changes, e.g. when the tab bar hides for the keyboard.
 */
type ViewInstance = ComponentRef<typeof View>;

export function useKeyboardInset(enabled = true): {
  ref: RefObject<ViewInstance | null>;
  inset: number;
  onLayout: (e: LayoutChangeEvent) => void;
} {
  const ref = useRef<ViewInstance | null>(null);
  const keyboardTopRef = useRef<number | null>(null);
  const [inset, setInset] = useState(0);

  const measure = useCallback((animate?: { duration: number }) => {
    const keyboardTop = keyboardTopRef.current;
    if (keyboardTop == null) {
      setInset(0);
      return;
    }
    ref.current?.measureInWindow((_x: number, y: number, _w: number, height: number) => {
      const overlap = Math.max(0, Math.round(y + height - keyboardTop));
      if (animate && animate.duration > 0 && Platform.OS === 'ios') {
        LayoutAnimation.configureNext({
          duration: animate.duration,
          update: { type: LayoutAnimation.Types.keyboard },
        });
      }
      setInset((prev) => (prev === overlap ? prev : overlap));
    });
  }, []);

  useEffect(() => {
    if (!enabled) {
      // Disabled: the returned inset is 0 regardless of the last measurement.
      keyboardTopRef.current = null;
      return;
    }
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = (e: KeyboardEvent) => {
      keyboardTopRef.current = e.endCoordinates.screenY;
      measure({ duration: e.duration ?? 0 });
    };
    const onHide = (e: KeyboardEvent) => {
      keyboardTopRef.current = null;
      if (Platform.OS === 'ios' && (e.duration ?? 0) > 0) {
        LayoutAnimation.configureNext({
          duration: e.duration,
          update: { type: LayoutAnimation.Types.keyboard },
        });
      }
      setInset(0);
    };
    const subs = [Keyboard.addListener(showEvent, onShow), Keyboard.addListener(hideEvent, onHide)];
    if (Platform.OS === 'ios') {
      // Keyboard height changes while open (QuickType bar, emoji keyboard).
      subs.push(Keyboard.addListener('keyboardWillChangeFrame', onShow));
    }
    return () => subs.forEach((s) => s.remove());
  }, [enabled, measure]);

  // The padding itself does not change the view's outer frame, so re-measuring
  // on layout only reacts to real moves (tab bar hiding, rotation).
  const onLayout = useCallback(() => {
    if (keyboardTopRef.current != null) measure();
  }, [measure]);

  return { ref, inset: enabled ? inset : 0, onLayout };
}
