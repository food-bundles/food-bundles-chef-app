import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppButton } from './AppButton';
import { radius, spacing, fontSize, fontWeight } from '@/lib/theme';
import { useTheme } from '@/providers/ThemeProvider';

export interface ConfirmationDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const tokens = useTheme();
  const { t } = useTranslation();
  const confirmText = confirmLabel ?? t('common.confirm');
  const cancelText = cancelLabel ?? t('common.cancel');
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      accessibilityViewIsModal
    >
      <Pressable style={[styles.backdrop, { backgroundColor: tokens.overlay }]} onPress={onCancel} accessibilityLabel={t('common.dismissDialog')}>
        <Pressable style={[styles.sheet, { backgroundColor: tokens.surfaceRaised }]} onPress={() => {}} accessibilityRole="alertdialog">
          <Text style={[styles.title, { color: tokens.text }]} accessibilityRole="header">{title}</Text>
          <Text style={[styles.message, { color: tokens.textMuted }]}>{message}</Text>
          <View style={styles.actions}>
            <View style={styles.cancelBtn}>
              <AppButton label={cancelText} onPress={onCancel} variant="ghost" />
            </View>
            <View style={styles.confirmBtn}>
              <AppButton
                label={confirmText}
                onPress={onConfirm}
                variant={destructive ? 'danger' : 'primary'}
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  sheet: {
    width: '100%',
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  message: {
    fontSize: fontSize.base,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cancelBtn: { flex: 1 },
  confirmBtn: { flex: 1 },
});
