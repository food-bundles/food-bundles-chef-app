import { useState, useEffect } from 'react';
import { View, Text, TextInput, Modal, StyleSheet, Alert } from 'react-native';
import { AppPressable } from '@/components/ui/AppPressable';
import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { validatePasscode } from '@/domain/rules/passcode';
import { setPasscode, verifyPasscode, removePasscode } from '@/store/passcode-store';
import { authPalette, colors } from '@/lib/theme';

type PasscodeMode = 'set' | 'change' | 'remove';

interface PasscodeModalProps {
  visible: boolean;
  mode: PasscodeMode;
  chefId: string;
  onDismiss: () => void;
  onSuccess: () => void;
}

export function PasscodeModal({ visible, mode, chefId, onDismiss, onSuccess }: PasscodeModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<'current' | 'new' | 'confirm'>('new');
  const [currentPasscode, setCurrentPasscode] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      // Reset state when modal opens
      setStep(mode === 'set' ? 'new' : 'current');
      setCurrentPasscode('');
      setNewPasscode('');
      setConfirmPasscode('');
      setError(null);
    }
  }, [visible, mode]);

  const handleCurrentNext = async () => {
    if (!currentPasscode.trim()) return;
    setError(null);
    setLoading(true);

    try {
      const isValid = await verifyPasscode(chefId, currentPasscode.trim());
      if (!isValid) {
        setError(t('security.incorrectCurrentPasscode'));
        setLoading(false);
        return;
      }

      if (mode === 'remove') {
        await removePasscode(chefId);
        Alert.alert(t('security.removePasscodeTitle'), t('security.passcodeRemovedSuccess'));
        onSuccess();
      } else {
        setStep('new');
      }
    } catch {
      setError(t('security.unlockError'));
    } finally {
      setLoading(false);
    }
  };

  const handleNewNext = () => {
    const validation = validatePasscode(newPasscode);
    if (!validation.valid) {
      setError(t(`security.${validation.errors[0]}`));
      return;
    }
    setError(null);
    setStep('confirm');
  };

  const handleConfirm = async () => {
    if (newPasscode !== confirmPasscode) {
      setError(t('security.passcodesDoNotMatch'));
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await setPasscode(chefId, newPasscode);
      const successMsg = mode === 'set' ? t('security.passcodeSetSuccess') : t('security.passcodeChangedSuccess');
      Alert.alert(mode === 'set' ? t('security.setPasscodeTitle') : t('security.changePasscodeTitle'), successMsg);
      onSuccess();
    } catch {
      setError(t('security.unlockError'));
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (mode === 'set') return t('security.setPasscodeTitle');
    if (mode === 'change') return t('security.changePasscodeTitle');
    return t('security.removePasscodeTitle');
  };

  const getMessage = () => {
    if (mode === 'set') return t('security.setPasscodeMessage');
    if (mode === 'remove') return t('security.removePasscodeMessage');
    if (step === 'current') return t('security.enterPasscode');
    if (step === 'new') return t('security.setPasscodeMessage');
    return t('security.confirmPasscode');
  };

  const getPlaceholder = () => {
    if (step === 'current') return t('security.currentPasscode');
    if (step === 'new') return t('security.newPasscode');
    return t('security.confirmPasscode');
  };

  const getValue = () => {
    if (step === 'current') return currentPasscode;
    if (step === 'new') return newPasscode;
    return confirmPasscode;
  };

  const setValue = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 6);
    if (step === 'current') setCurrentPasscode(digits);
    else if (step === 'new') setNewPasscode(digits);
    else setConfirmPasscode(digits);
    setError(null);
  };

  const handleNext = () => {
    if (step === 'current') void handleCurrentNext();
    else if (step === 'new') handleNewNext();
    else void handleConfirm();
  };

  const isDisabled = () => {
    if (loading) return true;
    const value = getValue();
    return !value || value.length < 4;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{getTitle()}</Text>
            <AppPressable
              onPress={onDismiss}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              style={styles.closeBtn}
            >
              <X size={24} color={authPalette.muted} />
            </AppPressable>
          </View>

          {/* Message */}
          <Text style={styles.message}>{getMessage()}</Text>

          {/* Input */}
          <TextInput
            keyboardAppearance="dark"
            value={getValue()}
            onChangeText={setValue}
            placeholder={getPlaceholder()}
            placeholderTextColor={authPalette.muted}
            keyboardType="number-pad"
            maxLength={6}
            secureTextEntry
            autoFocus
            textAlign="center"
            editable={!loading}
            accessibilityLabel={getPlaceholder()}
            style={[styles.input, error ? styles.inputError : null]}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Actions */}
          <View style={styles.actions}>
            {step !== 'confirm' && step !== (mode === 'set' ? 'new' : 'current') ? (
              <AppPressable
                onPress={() => setStep(step === 'new' ? 'current' : 'new')}
                accessibilityRole="button"
                accessibilityLabel={t('common.back')}
                style={styles.secondaryBtn}
              >
                <Text style={styles.secondaryBtnText}>{t('common.back')}</Text>
              </AppPressable>
            ) : null}

            <AppPressable
              onPress={handleNext}
              disabled={isDisabled()}
              accessibilityRole="button"
              accessibilityLabel={t('common.continue')}
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, flex: 1 })}
            >
              <View style={[styles.btn, isDisabled() && styles.btnDisabled]}>
                <Text style={[styles.btnText, isDisabled() && styles.btnTextDisabled]}>
                  {step === 'confirm' || mode === 'remove' ? t('common.confirm') : t('common.continue')}
                </Text>
              </View>
            </AppPressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: authPalette.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: authPalette.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  message: {
    color: authPalette.muted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  input: {
    backgroundColor: authPalette.input,
    color: colors.white,
    fontSize: 32,
    fontWeight: '700',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: authPalette.inputBorder,
    letterSpacing: 8,
    marginBottom: 16,
  },
  inputError: {
    borderColor: authPalette.error,
  },
  errorText: {
    color: authPalette.error,
    fontSize: 13,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    backgroundColor: colors.action,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnDisabled: {
    backgroundColor: authPalette.card,
    borderWidth: 1,
    borderColor: authPalette.border,
  },
  btnText: {
    color: colors.black,
    fontWeight: '800',
    fontSize: 16,
  },
  btnTextDisabled: {
    color: authPalette.divider,
  },
  secondaryBtn: {
    backgroundColor: authPalette.card,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: authPalette.border,
  },
  secondaryBtnText: {
    color: authPalette.muted,
    fontWeight: '700',
    fontSize: 16,
  },
});
