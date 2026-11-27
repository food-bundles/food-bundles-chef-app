import { Modal, View, Text, StyleSheet } from 'react-native';
import { AppPressable } from '@/components/ui/AppPressable';
import { Lock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/providers/ThemeProvider';
import { spacing, fontSize, fontWeight, radius } from '@/lib/theme';

interface PasscodeSuggestionModalProps {
  visible: boolean;
  onSetUp: () => void;
  onDismiss: () => void;
}

export function PasscodeSuggestionModal({
  visible,
  onSetUp,
  onDismiss,
}: PasscodeSuggestionModalProps) {
  const { t } = useTranslation();
  const tk = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      accessibilityViewIsModal
    >
      <View style={styles.backdrop}>
        <View style={[styles.dialog, { backgroundColor: tk.surfaceRaised, borderColor: tk.border }]}>
          {/* Icon */}
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: tk.actionTint },
            ]}
          >
            <Lock size={32} color={tk.action} strokeWidth={2} />
          </View>

          {/* Title */}
          <Text
            style={[styles.title, { color: tk.text }]}
            accessibilityRole="header"
          >
            {t('security.passcode')}
          </Text>

          {/* Message */}
          <Text style={[styles.message, { color: tk.textMuted }]}>
            {t('security.passcodeSetupSuggestion')}
          </Text>

          {/* Buttons */}
          <View style={styles.buttons}>
            <AppPressable
              onPress={onDismiss}
              accessibilityRole="button"
              accessibilityLabel={t('security.remindLater')}
              style={[styles.button, { backgroundColor: tk.surfaceSunken }]}
            >
              <Text style={[styles.buttonText, { color: tk.text }]}>
                {t('security.remindLater')}
              </Text>
            </AppPressable>

            <AppPressable
              onPress={onSetUp}
              accessibilityRole="button"
              accessibilityLabel={t('security.setUpNow')}
              style={[styles.button, { backgroundColor: tk.action }]}
            >
              <Text style={[styles.buttonText, { color: tk.onAction }]}>
                {t('security.setUpNow')}
              </Text>
            </AppPressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: 'center',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700' as const,
    textAlign: 'center',
  },
  message: {
    fontSize: fontSize.md,
    lineHeight: 22,
    textAlign: 'center',
  },
  buttons: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  button: {
    minHeight: 48,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  buttonText: {
    fontSize: fontSize.md,
    fontWeight: '600' as const,
  },
});
