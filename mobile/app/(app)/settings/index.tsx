import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, AppState, Linking, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  BellOff,
  Bot,
  Check,
  ChevronLeft,
  Globe,
  LogOut,
  MessageSquare,
  Moon,
  RefreshCw,
  Shield,
  Smartphone,
  Sun,
  Trash2,
  Volume2,
} from 'lucide-react-native';
import { AppButton } from '@/components/ui/AppButton';
import { AppPressable } from '@/components/ui/AppPressable';
import { ListRow } from '@/components/ui/ListRow';
import { Snackbar } from '@/components/ui/Snackbar';
import { useSessionStore } from '@/store/session-store';
import { useThemePreference, useTheme } from '@/providers/ThemeProvider';
import type { ThemePreference } from '@/lib/theme-preference';
import { fontSize, fontWeight, radius, spacing } from '@/lib/theme';
import { currentLanguage, LANGUAGE_NAMES, setAppLanguage, SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n/language';
import { getSpokenReplies, hasAiConsent, privacyPolicyUrl, revokeAiConsent, setSpokenReplies } from '@/features/ai/consent';
import {
  cancelDailyLowStockReminder,
  getNotificationPermissionStatus,
  requestNotificationPermission,
  scheduleDailyLowStockReminder,
  type NotificationPermissionStatus,
} from '@/services/notifications';

const SUPPORT_EMAIL = 'support@foodbundles.rw';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const tokens = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const signOut = useSessionStore((s) => s.signOut);
  const { preference: themePreference, setPreference: setThemePreference } = useThemePreference();

  const [permStatus, setPermStatus] = useState<NotificationPermissionStatus>('undetermined');
  const [dailyReminder, setDailyReminder] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [language, setLanguage] = useState<SupportedLanguage>(currentLanguage());
  const [spoken, setSpoken] = useState(false);
  const [aiConsent, setAiConsent] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);

  const policyUrl = privacyPolicyUrl();
  const version = Constants.expoConfig?.version ?? '';

  useEffect(() => {
    void getSpokenReplies().then(setSpoken);
    void hasAiConsent().then(setAiConsent);
  }, []);

  const refreshPermStatus = useCallback(async () => {
    setPermStatus(await getNotificationPermissionStatus());
  }, []);

  useEffect(() => {
    let active = true;
    void getNotificationPermissionStatus().then((status) => {
      if (active) setPermStatus(status);
    });
    return () => {
      active = false;
    };
  }, []);

  // Re-check permission when returning from the device settings (#19).
  const appStateRef = useRef(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (appStateRef.current !== 'active' && next === 'active') void refreshPermStatus();
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [refreshPermStatus]);

  const changeLanguage = async (lang: SupportedLanguage) => {
    setLanguage(lang);
    await setAppLanguage(lang);
  };

  const requestPermission = async () => {
    setRequesting(true);
    setPermStatus(await requestNotificationPermission());
    setRequesting(false);
  };

  const toggleDailyReminder = async (value: boolean) => {
    setDailyReminder(value);
    if (value) await scheduleDailyLowStockReminder(7, 0);
    else await cancelDailyLowStockReminder();
  };

  const toggleSpoken = async (value: boolean) => {
    setSpoken(value);
    await setSpokenReplies(value);
  };

  const toggleAiConsent = async (value: boolean) => {
    if (value) {
      // Consent is given through the notice itself, on the next AI use.
      setSnack(t('settings.ai.consentNextUse'));
      return;
    }
    await revokeAiConsent();
    setAiConsent(false);
  };

  // Real refresh: refetch everything the app is showing (no simulated "sync").
  const refreshData = async () => {
    setRefreshing(true);
    try {
      await qc.invalidateQueries();
      await qc.refetchQueries({ type: 'active' });
      setSnack(t('settings.refreshDone'));
    } catch {
      setSnack(t('settings.refreshFailed'));
    } finally {
      setRefreshing(false);
    }
  };

  const confirmSignOut = () =>
    Alert.alert(t('profile.signOutConfirmTitle'), t('profile.signOutConfirmMsg'), [
      { text: t('profile.signOutConfirmCancel'), style: 'cancel' },
      {
        text: t('profile.signOutConfirmAction'),
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/welcome');
        },
      },
    ]);

  const explainDeleteAccount = () =>
    Alert.alert(t('settings.deleteAccount'), t('settings.deleteAccountBody', { email: SUPPORT_EMAIL }), [
      { text: t('common.close'), style: 'cancel' },
      { text: t('settings.contactSupport'), onPress: () => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`) },
    ]);

  const themeOptions: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
    { value: 'light', label: t('settings.themeLight'), Icon: Sun },
    { value: 'dark', label: t('settings.themeDark'), Icon: Moon },
    { value: 'system', label: t('settings.themeSystem'), Icon: Smartphone },
  ];

  return (
    <View style={[styles.root, { backgroundColor: tokens.surface, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: tokens.border, backgroundColor: tokens.surfaceRaised }]}>
        <AppPressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <ChevronLeft size={24} color={tokens.text} strokeWidth={2} />
        </AppPressable>
        <Text style={[styles.headerTitle, { color: tokens.text }]} accessibilityRole="header">
          {t('settings.title')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]} showsVerticalScrollIndicator={false}>
        {/* Notifications */}
        <Section title={t('settings.sectionNotifications')}>
          <ListRow
            icon={permStatus === 'granted' ? <Bell size={18} color={tokens.link} /> : <BellOff size={18} color={tokens.textMuted} />}
            iconBg={tokens.primaryTint}
            title={t('settings.pushNotifications')}
            subtitle={
              permStatus === 'granted'
                ? t('settings.notificationsOn')
                : permStatus === 'denied'
                  ? t('settings.notificationsDenied')
                  : t('settings.notificationsOff')
            }
            trailing={
              permStatus === 'undetermined' ? (
                <View style={styles.inlineButton}>
                  <AppButton label={t('settings.enableNotifications')} onPress={() => void requestPermission()} loading={requesting} />
                </View>
              ) : undefined
            }
            chevron={false}
          />
          <ListRow
            title={t('settings.dailyStockReminder')}
            subtitle={t('settings.dailyStockReminderSub')}
            trailing={
              <Switch
                value={dailyReminder}
                onValueChange={(v) => void toggleDailyReminder(v)}
                disabled={permStatus !== 'granted'}
                trackColor={{ false: tokens.border, true: tokens.primary }}
                thumbColor={tokens.surfaceRaised}
                ios_backgroundColor={tokens.border}
                accessibilityLabel={t('settings.dailyStockReminder')}
              />
            }
            chevron={false}
            separator={false}
          />
        </Section>
        {permStatus === 'denied' ? (
          <View style={[styles.banner, { backgroundColor: tokens.warningTint }]}>
            <Text style={[styles.bannerTitle, { color: tokens.warningText }]}>{t('settings.notificationsBlocked')}</Text>
            <Text style={[styles.bannerBody, { color: tokens.text }]}>{t('settings.notificationsBlockedBody')}</Text>
            <AppButton label={t('settings.openSettings')} variant="secondary" onPress={() => void Linking.openSettings()} />
          </View>
        ) : null}

        {/* Kitchen */}
        <Section title={t('settings.sectionKitchen')}>
          <ListRow
            icon={<Globe size={18} color={tokens.link} />}
            iconBg={tokens.primaryTint}
            title={t('settings.manageKitchens')}
            subtitle={t('settings.manageKitchensSub')}
            onPress={() => router.push('/(app)/kitchens')}
          />
          <ListRow
            icon={<RefreshCw size={18} color={tokens.link} />}
            iconBg={tokens.primaryTint}
            title={refreshing ? t('settings.refreshing') : t('settings.syncData')}
            subtitle={t('settings.syncDataSub')}
            onPress={() => void refreshData()}
            disabled={refreshing}
            chevron={false}
            separator={false}
          />
        </Section>

        {/* Appearance */}
        <Section title={t('settings.sectionAppearance')}>
          <View style={styles.segmentWrap}>
            <Text style={[styles.rowTitle, { color: tokens.text }]}>{t('settings.theme')}</Text>
            <View style={styles.segment} accessibilityRole="radiogroup">
              {themeOptions.map(({ value, label, Icon }) => {
                const active = themePreference === value;
                return (
                  <AppPressable
                    key={value}
                    onPress={() => void setThemePreference(value)}
                    accessibilityRole="radio"
                    accessibilityLabel={label}
                    accessibilityState={{ checked: active }}
                    style={({ pressed }) => [
                      styles.segmentItem,
                      { borderColor: active ? tokens.primary : tokens.border, backgroundColor: active ? tokens.primary : 'transparent' },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Icon size={16} color={active ? tokens.onPrimary : tokens.text} />
                    <Text style={[styles.segmentText, { color: active ? tokens.onPrimary : tokens.text }]}>{label}</Text>
                  </AppPressable>
                );
              })}
            </View>
          </View>
        </Section>

        {/* Language — each name in its own language, never truncated */}
        <Section title={t('settings.language')}>
          <View accessibilityRole="radiogroup">
            {SUPPORTED_LANGUAGES.map((lang, i) => (
              <ListRow
                key={lang}
                title={LANGUAGE_NAMES[lang]}
                onPress={() => void changeLanguage(lang)}
                trailing={language === lang ? <Check size={20} color={tokens.link} /> : undefined}
                chevron={false}
                separator={i < SUPPORTED_LANGUAGES.length - 1}
                accessibilityLabel={`${LANGUAGE_NAMES[lang]}${language === lang ? `, ${t('settings.selected')}` : ''}`}
              />
            ))}
          </View>
        </Section>

        {/* Assistant & AI */}
        <Section title={t('settings.sectionAi')}>
          <ListRow
            icon={<Volume2 size={18} color={tokens.link} />}
            iconBg={tokens.primaryTint}
            title={t('settings.ai.spokenReplies')}
            subtitle={language === 'rw' ? t('settings.ai.spokenRepliesNoRw') : t('settings.ai.spokenRepliesSub')}
            trailing={
              <Switch
                value={spoken}
                onValueChange={(v) => void toggleSpoken(v)}
                trackColor={{ false: tokens.border, true: tokens.primary }}
                thumbColor={tokens.surfaceRaised}
                ios_backgroundColor={tokens.border}
                accessibilityLabel={t('settings.ai.spokenReplies')}
              />
            }
            chevron={false}
          />
          <ListRow
            icon={<Bot size={18} color={tokens.link} />}
            iconBg={tokens.primaryTint}
            title={t('settings.ai.photosVoice')}
            subtitle={t('settings.ai.photosVoiceSub')}
            trailing={
              <Switch
                value={aiConsent}
                onValueChange={(v) => void toggleAiConsent(v)}
                trackColor={{ false: tokens.border, true: tokens.primary }}
                thumbColor={tokens.surfaceRaised}
                ios_backgroundColor={tokens.border}
                accessibilityLabel={t('settings.ai.photosVoice')}
              />
            }
            chevron={false}
            separator={false}
          />
        </Section>

        {/* Support */}
        <Section title={t('settings.sectionSupport')}>
          <ListRow
            icon={<MessageSquare size={18} color={tokens.link} />}
            iconBg={tokens.primaryTint}
            title={t('settings.contactSupport')}
            subtitle={SUPPORT_EMAIL}
            onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
            separator={Boolean(policyUrl)}
          />
          {policyUrl ? (
            <ListRow
              icon={<Shield size={18} color={tokens.link} />}
              iconBg={tokens.primaryTint}
              title={t('settings.privacyPolicy')}
              subtitle={t('settings.privacyPolicySub')}
              onPress={() => void Linking.openURL(policyUrl)}
              separator={false}
            />
          ) : null}
        </Section>

        {/* Account */}
        <Section title={t('settings.sectionAccount')}>
          <ListRow
            icon={<LogOut size={18} color={tokens.danger} />}
            iconBg={tokens.dangerTint}
            title={t('settings.signOut')}
            onPress={confirmSignOut}
            destructive
            chevron={false}
          />
          <ListRow
            icon={<Trash2 size={18} color={tokens.danger} />}
            iconBg={tokens.dangerTint}
            title={t('settings.deleteAccount')}
            subtitle={t('settings.deleteAccountSub')}
            onPress={explainDeleteAccount}
            destructive
            chevron={false}
            separator={false}
          />
        </Section>

        {/* Footer — long-press the version to open the UI gallery (development builds only) */}
        <View style={styles.footer}>
          <Text style={[styles.footerName, { color: tokens.text }]}>{t('common.appName')}</Text>
          <AppPressable
            onLongPress={__DEV__ ? () => router.push('/(dev)/ui-gallery') : undefined}
            accessibilityRole="text"
            accessibilityHint={__DEV__ ? t('settings.galleryHint') : undefined}
            hitSlop={{ top: 12, bottom: 12, left: 32, right: 32 }}
          >
            <Text style={[styles.footerMuted, { color: tokens.textMuted }]}>{t('settings.version', { version })}</Text>
          </AppPressable>
          <Text style={[styles.footerMuted, { color: tokens.textMuted }]}>{t('profile.footerTagline')}</Text>
        </View>
      </ScrollView>

      <Snackbar visible={snack !== null} message={snack ?? ''} onDismiss={() => setSnack(null)} />
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const tokens = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: tokens.textMuted }]} accessibilityRole="header">
        {title}
      </Text>
      <View style={[styles.card, { backgroundColor: tokens.surfaceRaised, borderColor: tokens.border }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  pressed: { opacity: 0.7 },
  content: { padding: spacing.md, gap: spacing.lg },
  section: { gap: spacing.sm },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  card: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  inlineButton: { minWidth: 96 },
  banner: { borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  bannerTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  bannerBody: { fontSize: fontSize.sm, lineHeight: 20 },
  segmentWrap: { padding: spacing.md, gap: spacing.sm },
  rowTitle: { fontSize: fontSize.base, fontWeight: fontWeight.medium },
  segment: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  segmentItem: {
    flexGrow: 1,
    flexBasis: 90,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  segmentText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  footer: { alignItems: 'center', gap: 4, paddingTop: spacing.sm },
  footerName: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, textTransform: 'uppercase', letterSpacing: 1.5 },
  footerMuted: { fontSize: fontSize.xs },
});
