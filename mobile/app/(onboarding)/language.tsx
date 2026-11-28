import { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { AppPressable } from '@/components/ui/AppPressable';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { updateProfile } from '@/api/auth-api';
import { ApiError } from '@/api/errors';
import { useSessionStore } from '@/store/session-store';
import { authPalette, colors } from '@/lib/theme';
import {
  setAppLanguage,
  LANGUAGE_NAMES,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from '@/i18n/language';
import { loadOnboardingState, saveOnboardingState, clearOnboardingState } from '@/store/onboarding-store';

export default function OnboardingLanguageScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const chef = useSessionStore((s) => s.chef);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(
    i18n.language.slice(0, 2) as SupportedLanguage
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFinish = async () => {
    setError(null);
    setLoading(true);
    try {
      // Set language preference
      await setAppLanguage(selectedLanguage);

      // Mark onboarding complete on backend
      await updateProfile({
        preferred_locale: selectedLanguage,
        onboarding_completed_at: new Date().toISOString(),
      });

      // Mark language step complete locally
      if (chef?.id) {
        const state = await loadOnboardingState(chef.id);
        await saveOnboardingState(chef.id, { ...state, languageComplete: true });
        // Clear local state since backend is now marked complete
        await clearOnboardingState(chef.id);
      }

      router.replace('/(app)/(tabs)');
    } catch (err) {
      if (err instanceof ApiError) {
        switch (err.kind) {
          case 'transport':
            setError(t('onboarding.noConnection'));
            break;
          default:
            setError(t('onboarding.saveError'));
        }
      } else {
        setError(t('auth.somethingWrong'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior="padding" keyboardVerticalOffset={0}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Progress indicator */}
        <View style={styles.progress}>
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
        </View>

        {/* Heading */}
        <Text style={styles.eyebrow}>{t('onboarding.stepLanguage')}</Text>
        <Text style={styles.heading}>{t('onboarding.languageTitle')}</Text>
        <Text style={styles.sub}>{t('onboarding.languageSubtitle')}</Text>

        {/* Language options */}
        <View style={styles.languages}>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang}
              onPress={() => setSelectedLanguage(lang)}
              style={[styles.languageCard, selectedLanguage === lang && styles.languageCardSelected]}
              accessibilityRole="radio"
              accessibilityState={{ checked: selectedLanguage === lang }}
            >
              <Text style={[styles.languageName, selectedLanguage === lang && styles.languageNameSelected]}>
                {LANGUAGE_NAMES[lang]}
              </Text>
              {selectedLanguage === lang ? (
                <Check size={24} color={colors.action} strokeWidth={3} />
              ) : null}
            </TouchableOpacity>
          ))}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      {/* CTA */}
      <View style={[styles.cta, { paddingBottom: Math.max(insets.bottom + 12, 28) }]}>
        <AppPressable
          onPress={handleFinish}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.finish')}
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <View style={[styles.btn, loading && styles.btnDisabled]}>
            <Text style={[styles.btnText, loading && styles.btnTextDisabled]}>
              {loading ? t('common.saving') : t('onboarding.finish')}
            </Text>
          </View>
        </AppPressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: authPalette.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  progress: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  progressDot: {
    width: 32,
    height: 4,
    backgroundColor: authPalette.card,
    borderRadius: 2,
  },
  progressDotActive: {
    backgroundColor: colors.action,
  },
  eyebrow: {
    color: colors.action,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heading: {
    color: colors.white,
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  sub: {
    color: authPalette.muted,
    fontSize: 15,
    marginBottom: 24,
    lineHeight: 22,
  },
  languages: {
    gap: 12,
  },
  languageCard: {
    backgroundColor: authPalette.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: authPalette.border,
    paddingVertical: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  languageCardSelected: {
    borderColor: colors.action,
    backgroundColor: authPalette.inputBorder,
  },
  languageName: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  languageNameSelected: {
    color: colors.white,
    fontWeight: '800',
  },
  errorText: {
    color: authPalette.error,
    fontSize: 13,
    marginTop: 16,
  },
  cta: {
    paddingHorizontal: 24,
    paddingTop: 14,
    backgroundColor: authPalette.bg,
    borderTopWidth: 1,
    borderTopColor: authPalette.ctaBar,
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
    shadowColor: colors.action,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 10,
  },
  btnDisabled: {
    backgroundColor: authPalette.card,
    borderColor: authPalette.border,
    shadowOpacity: 0,
    elevation: 0,
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
});
