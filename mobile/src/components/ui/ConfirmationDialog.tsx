import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import { AppButton } from './AppButton';
import { colors, radius, spacing, fontSize, fontWeight } from '@/lib/theme';

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
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      accessibilityViewIsModal
    >
      <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel="Dismiss dialog">
        <Pressable style={styles.sheet} onPress={() => {}} accessibilityRole="alertdialog">
          <Text style={styles.title} accessibilityRole="header">{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <View style={styles.cancelBtn}>
              <AppButton label={cancelLabel} onPress={onCancel} variant="ghost" />
            </View>
            <View style={styles.confirmBtn}>
              <AppButton
                label={confirmLabel}
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  sheet: {
    width: '100%',
    backgroundColor: colors.surface[850],
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  message: {
    color: colors.surface[400],
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
