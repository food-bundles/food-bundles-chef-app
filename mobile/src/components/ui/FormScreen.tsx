import { KeyboardAvoidingView, Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { colors } from '@/lib/theme';

export interface FormScreenProps {
  children: React.ReactNode;
  /** Override background, defaults to theme surface-50 / surface-950. */
  backgroundColor?: string;
}

/**
 * Wraps a form screen with a full-flex KeyboardAvoidingView.
 *
 * Layout contract:
 *   <FormScreen>
 *     <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 16 }}>
 *       {fields}
 *     </ScrollView>
 *     <StickyFooter>
 *       <AppButton size="lg" … />
 *     </StickyFooter>
 *   </FormScreen>
 *
 * On iOS: KAV behavior="padding" lifts the StickyFooter above the keyboard.
 * On Android: behavior=undefined — the OS resize mode handles it via
 *   android.softwareKeyboardLayoutMode = "resize" in app.json.
 */
export function FormScreen({ children, backgroundColor }: FormScreenProps) {
  const isDark = useColorScheme() === 'dark';
  const bg = backgroundColor ?? (isDark ? colors.surface[950] : colors.surface[50]);

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {children}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  kav: { flex: 1 },
});
