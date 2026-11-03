import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { hit, radius, space, text, useTheme } from '@/theme';
import { ScreenScroll } from '@/components/layout';
import { Input } from '@/components/primitives';
import { ChevronLeftIcon, LogoMark } from '@/components/icons';
import { useSessionStore } from '@/stores/sessionStore';
import { useT } from '@/i18n';
import { account } from '@/mocks';

export default function Login() {
  const t = useT();
  const { colors } = useTheme();
  const login = useSessionStore((s) => s.login);
  const [email, setEmail] = useState(account.email);
  const [password, setPassword] = useState('••••••••');
  const [showPassword, setShowPassword] = useState(false);

  const onLogin = () => {
    login();
    router.replace('/(app)/(tabs)');
  };

  return (
    <ScreenScroll>
      <Pressable
        onPress={() => router.push('/(public)/onboarding')}
        accessibilityRole="button"
        accessibilityLabel={t('auth_backToBrowsing')}
        style={styles.backButton}
      >
        <ChevronLeftIcon />
      </Pressable>
      <View style={styles.logoWrap}>
        <LogoMark />
      </View>
      <Text style={[styles.title, { color: colors.ink }]}>{t('auth_welcomeBack')}</Text>
      <Text style={[styles.subtitle, { color: colors.secondary }]}>{t('auth_loginSub')}</Text>
      <View style={styles.fields}>
        <Input label={t('auth_email')} value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Input
          label={t('auth_password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          rightSlot={
            <Pressable
              onPress={() => setShowPassword((prev) => !prev)}
              accessibilityRole="button"
              accessibilityLabel={t('auth_show')}
              style={styles.showButton}
            >
              <Text style={[styles.showLabel, { color: colors.leaf }]}>{t('auth_show')}</Text>
            </Pressable>
          }
        />
        <Pressable
          onPress={() => router.push('/(auth)/forgot-password')}
          accessibilityRole="button"
          accessibilityLabel={t('auth_forgotQ')}
          style={styles.forgotButton}
        >
          <Text style={[styles.forgotLabel, { color: colors.leaf }]}>{t('auth_forgotQ')}</Text>
        </Pressable>
      </View>
      <Pressable
        onPress={onLogin}
        accessibilityRole="button"
        accessibilityLabel={t('auth_logIn')}
        style={[styles.loginButton, { backgroundColor: colors.leaf }]}
      >
        <Text style={[styles.loginLabel, { color: colors.paper }]}>{t('auth_logIn')}</Text>
      </Pressable>
      <View style={styles.signupRow}>
        <Text style={[styles.signupText, { color: colors.secondary }]}>{t('auth_newHere')} </Text>
        <Pressable
          onPress={() => router.push('/(auth)/signup')}
          accessibilityRole="button"
          accessibilityLabel={t('auth_createBizAccount')}
          style={styles.signupButton}
        >
          <Text style={[styles.signupLink, { color: colors.leaf }]}>{t('auth_createBizAccount')}</Text>
        </Pressable>
      </View>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  backButton: { width: hit.min, height: hit.min, alignItems: 'center', justifyContent: 'center' },
  logoWrap: { marginTop: space.sm },
  title: { ...text.h1, marginTop: space.lg },
  subtitle: { ...text.body, marginTop: space.xs, marginBottom: space.lg },
  fields: { gap: space.md },
  showButton: { minHeight: hit.min, paddingHorizontal: space.xs, alignItems: 'center', justifyContent: 'center' },
  showLabel: { ...text.label },
  forgotButton: { minHeight: hit.min, alignItems: 'flex-end', justifyContent: 'center' },
  forgotLabel: { ...text.label },
  loginButton: {
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.lg,
  },
  loginLabel: { ...text.bodySemi },
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: space.lg },
  signupText: { ...text.caption },
  signupButton: { minHeight: hit.min, alignItems: 'center', justifyContent: 'center' },
  signupLink: { ...text.label },
});
