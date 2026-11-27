import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { AppPressable } from '@/components/ui/AppPressable';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Lock, LogOut } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSessionStore } from '@/store/session-store';
import { useInactivityStore } from '@/store/inactivity-store';
import {
  verifyPasscode,
  recordFailedAttempt,
  clearFailedAttempts,
  getFailedAttempts,
  getLastFailedAt,
} from '@/store/passcode-store';
import {
  isLockedOut,
  getRemainingLockoutTime,
  shouldOfferOtpFallback,
} from '@/domain/rules/passcode';
import { authPalette, colors } from '@/lib/theme';

export default function UnlockScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const chef = useSessionStore((s) => s.chef);
  const signOut = useSessionStore((s) => s.signOut);
  const unlock = useInactivityStore((s) => s.unlock);
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  useEffect(() => {
    void loadAttempts();
  }, [chef?.id]);

  useEffect(() => {
    if (lockoutRemaining > 0) {
      const timer = setInterval(() => {
        setLockoutRemaining((prev) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockoutRemaining]);

  const loadAttempts = async () => {
    if (!chef?.id) return;
    const attempts = await getFailedAttempts(chef.id);
    const lastFailed = await getLastFailedAt(chef.id);
    setFailedAttempts(attempts);
    
    if (isLockedOut(attempts, lastFailed, Date.now())) {
      setLockoutRemaining(getRemainingLockoutTime(attempts, lastFailed, Date.now()));
    }
  };

  const handleUnlock = async () => {
    if (!chef?.id || !passcode.trim() || loading) return;
    
    // Check lockout
    const lastFailed = await getLastFailedAt(chef.id);
    if (isLockedOut(failedAttempts, lastFailed, Date.now())) {
      setError(t('security.stillLockedOut'));
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const isValid = await verifyPasscode(chef.id, passcode.trim());

      if (isValid) {
        await clearFailedAttempts(chef.id);
        unlock();
        router.replace('/(app)/(tabs)');
      } else {
        const newAttempts = await recordFailedAttempt(chef.id);
        setFailedAttempts(newAttempts);
        setPasscode('');

        if (isLockedOut(newAttempts, Date.now(), Date.now())) {
          const remaining = getRemainingLockoutTime(newAttempts, Date.now(), Date.now());
          setLockoutRemaining(remaining);
          setError(t('security.tooManyAttempts', { seconds: remaining }));
        } else {
          const attemptsLeft = 5 - newAttempts;
          if (attemptsLeft > 0) {
            setError(t('security.incorrectPasscode', { attempts: attemptsLeft }));
          } else {
            setError(t('security.incorrectPasscode_other'));
          }
        }
      }
    } catch (err) {
      setError(t('security.unlockError'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasscode = () => {
    Alert.alert(
      t('security.forgotPasscodeTitle'),
      t('security.forgotPasscodeMessage'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('security.signOutButton'),
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/phone-number');
          },
        },
      ]
    );
  };

  const isDisabled = !passcode.trim() || loading || lockoutRemaining > 0;
  const showOtpFallback = shouldOfferOtpFallback(failedAttempts);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24 }]}>
      <View style={styles.content}>
        {/* Lock icon */}
        <View style={styles.iconContainer}>
          <Lock size={64} color={colors.action} strokeWidth={1.5} />
        </View>

        {/* Heading */}
        <Text style={styles.heading}>{t('security.unlockTitle')}</Text>
        <Text style={styles.sub}>{t('security.unlockSubtitle')}</Text>

        {/* Passcode input */}
        <TextInput
          keyboardAppearance="dark"
          value={passcode}
          onChangeText={(v) => {
            setPasscode(v.replace(/\D/g, '').slice(0, 6));
            setError(null);
          }}
          placeholder={t('security.enterPasscode')}
          placeholderTextColor={authPalette.muted}
          keyboardType="number-pad"
          maxLength={6}
          secureTextEntry
          autoFocus
          textAlign="center"
          editable={!loading && lockoutRemaining === 0}
          accessibilityLabel={t('security.passcodeLabel')}
          style={[
            styles.input,
            error ? styles.inputError : null,
            lockoutRemaining > 0 ? styles.inputDisabled : null,
          ]}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {lockoutRemaining > 0 ? (
          <View style={styles.lockoutBanner}>
            <Text style={styles.lockoutText}>
              {t('security.lockedOut', { seconds: lockoutRemaining })}
            </Text>
            {loading ? <ActivityIndicator size="small" color={colors.action} /> : null}
          </View>
        ) : null}

        {/* Unlock button */}
        <AppPressable
          onPress={handleUnlock}
          disabled={isDisabled}
          accessibilityRole="button"
          accessibilityLabel={t('security.unlockButton')}
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, marginTop: 24 })}
        >
          <View style={[styles.btn, isDisabled && styles.btnDisabled]}>
            <Text style={[styles.btnText, isDisabled && styles.btnTextDisabled]}>
              {loading ? t('security.unlocking') : t('security.unlockButton')}
            </Text>
          </View>
        </AppPressable>

        {/* Forgot passcode */}
        <TouchableOpacity
          onPress={handleForgotPasscode}
          style={styles.forgotBtn}
          accessibilityRole="button"
          accessibilityLabel={t('security.forgotPasscode')}
        >
          <LogOut size={16} color={authPalette.muted} />
          <Text style={styles.forgotText}>{t('security.forgotPasscode')}</Text>
        </TouchableOpacity>

        {showOtpFallback ? (
          <Text style={styles.otpHint}>{t('security.otpFallbackHint')}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: authPalette.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  iconContainer: {
    alignSelf: 'center',
    marginBottom: 32,
    padding: 24,
    backgroundColor: authPalette.card,
    borderRadius: 60,
  },
  heading: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  sub: {
    color: authPalette.muted,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  input: {
    backgroundColor: authPalette.input,
    color: colors.white,
    fontSize: 32,
    fontWeight: '700',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 20,
    borderWidth: 1.5,
    borderColor: authPalette.inputBorder,
    letterSpacing: 8,
  },
  inputError: {
    borderColor: authPalette.error,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  errorText: {
    color: authPalette.error,
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
  },
  lockoutBanner: {
    backgroundColor: authPalette.card,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  lockoutText: {
    color: colors.action,
    fontSize: 14,
    fontWeight: '600',
  },
  btn: {
    width: '80%',
    alignSelf: 'center',
    backgroundColor: colors.action,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.white,
    paddingVertical: 18,
    alignItems: 'center',
  },
  btnDisabled: {
    backgroundColor: authPalette.card,
    borderColor: authPalette.border,
  },
  btnText: {
    color: colors.black,
    fontWeight: '800',
    fontSize: 17,
    letterSpacing: 0.3,
  },
  btnTextDisabled: {
    color: authPalette.divider,
  },
  forgotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    padding: 12,
  },
  forgotText: {
    color: authPalette.muted,
    fontSize: 15,
    fontWeight: '600',
  },
  otpHint: {
    color: authPalette.muted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
});
