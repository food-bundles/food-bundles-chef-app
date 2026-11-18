import { Alert, Linking } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import i18n from '@/i18n';

const CONSENT_KEY = 'fb.chef.ai_consent_v1';
const SPOKEN_REPLIES_KEY = 'fb.chef.ai_spoken_replies';

/** Privacy policy URL from build config (EXPO_PUBLIC_PRIVACY_POLICY_URL); empty when not configured. */
export function privacyPolicyUrl(): string {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const url = extra?.privacyPolicyUrl;
  return typeof url === 'string' ? url : '';
}

export async function hasAiConsent(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(CONSENT_KEY)) === 'yes';
  } catch {
    return false;
  }
}

/**
 * One-time notice before the first AI use: photos and voice are sent to an AI
 * service for processing and are not kept by Food Bundles. Resolves true when the
 * chef agrees (now or earlier).
 */
export async function ensureAiConsent(): Promise<boolean> {
  if (await hasAiConsent()) return true;
  const t = i18n.t.bind(i18n);
  const url = privacyPolicyUrl();
  return new Promise((resolve) => {
    const buttons: Parameters<typeof Alert.alert>[2] = [
      { text: t('ai.consent.decline'), style: 'cancel', onPress: () => resolve(false) },
      {
        text: t('ai.consent.accept'),
        onPress: () => {
          void SecureStore.setItemAsync(CONSENT_KEY, 'yes').catch(() => undefined);
          resolve(true);
        },
      },
    ];
    if (url) {
      buttons.unshift({
        text: t('ai.consent.policy'),
        onPress: () => {
          void Linking.openURL(url);
          resolve(false);
        },
      });
    }
    Alert.alert(t('ai.consent.title'), t('ai.consent.body'), buttons, {
      cancelable: true,
      onDismiss: () => resolve(false),
    });
  });
}

/** Withdraw AI consent: the notice is shown again before the next photo or voice upload. */
export async function revokeAiConsent(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(CONSENT_KEY);
  } catch {
    // Nothing stored.
  }
}

export async function getSpokenReplies(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(SPOKEN_REPLIES_KEY)) === 'on';
  } catch {
    return false;
  }
}

export async function setSpokenReplies(on: boolean): Promise<void> {
  try {
    await SecureStore.setItemAsync(SPOKEN_REPLIES_KEY, on ? 'on' : 'off');
  } catch {
    // Preference not saved; the toggle simply resets next launch.
  }
}
