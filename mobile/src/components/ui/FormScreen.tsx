import type { ComponentRef, ReactNode, Ref } from 'react';
import { Platform, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { KeyboardActionBar } from './KeyboardActionBar';
import { StickyFooter } from './StickyFooter';
import { FormActionRow, type FormAction } from './FormActionButton';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';
import { useKeyboardVisible } from '@/hooks/useKeyboardVisible';
import { useTheme } from '@/providers/ThemeProvider';
import { spacing } from '@/lib/theme';

export interface FormScreenProps {
  children: ReactNode;
  /** Primary actions: pinned under the header while typing, in the sticky footer otherwise. */
  actions?: FormAction[];
  /** Extra content above the footer buttons (e.g. a warning). Hidden while typing. */
  footerNote?: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollRef?: Ref<ComponentRef<typeof ScrollView>>;
  /** Extra top padding for the keyboard bar on screens without a header (full-bleed heroes). */
  keyboardBarTopInset?: number;
}

/**
 * The one scroll container for a form screen. Place it directly under the header.
 *
 * - iOS: `automaticallyAdjustKeyboardInsets` insets the scroll view by the keyboard
 *   height and scrolls the focused input into view.
 * - Android: edge-to-edge apps are not resized for the keyboard, so the container is
 *   padded by the measured keyboard overlap (0 if the window did resize). The native
 *   ScrollView then scrolls the focused input back into view as it shrinks.
 *
 * Never nest another vertical ScrollView/FlatList inside `children`.
 */
export function FormScreen({
  children,
  actions = [],
  footerNote,
  contentContainerStyle,
  scrollRef,
  keyboardBarTopInset = 0,
}: FormScreenProps) {
  const tokens = useTheme();
  const keyboardVisible = useKeyboardVisible();
  const { ref: insetRef, inset: keyboardInset, onLayout: onInsetLayout } = useKeyboardInset(Platform.OS === 'android');
  const hasActions = actions.length > 0;

  return (
    <View
      ref={insetRef}
      onLayout={onInsetLayout}
      style={[styles.container, { backgroundColor: tokens.surface, paddingBottom: keyboardInset }]}
    >
      {hasActions && <KeyboardActionBar actions={actions} visible={keyboardVisible} topInset={keyboardBarTopInset} />}
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.content, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {hasActions && !keyboardVisible && (
        <StickyFooter>
          {footerNote}
          <FormActionRow actions={actions} placement="footer" />
        </StickyFooter>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
});
