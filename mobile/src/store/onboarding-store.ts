import * as SecureStore from 'expo-secure-store';
import type { OnboardingState } from '@/domain/rules/onboarding';

const ONBOARDING_STATE_KEY = 'fb.chef.onboarding_state';

/**
 * Load onboarding state for a specific chef from SecureStore.
 */
export async function loadOnboardingState(chefId: string): Promise<OnboardingState> {
  try {
    const key = `${ONBOARDING_STATE_KEY}.${chefId}`;
    const json = await SecureStore.getItemAsync(key);
    if (!json) {
      return { profileComplete: false, kitchenComplete: false, languageComplete: false };
    }
    return JSON.parse(json) as OnboardingState;
  } catch {
    return { profileComplete: false, kitchenComplete: false, languageComplete: false };
  }
}

/**
 * Save onboarding state for a specific chef to SecureStore.
 */
export async function saveOnboardingState(
  chefId: string,
  state: OnboardingState
): Promise<void> {
  const key = `${ONBOARDING_STATE_KEY}.${chefId}`;
  await SecureStore.setItemAsync(key, JSON.stringify(state));
}

/**
 * Clear onboarding state for a specific chef (after successful backend sync).
 */
export async function clearOnboardingState(chefId: string): Promise<void> {
  const key = `${ONBOARDING_STATE_KEY}.${chefId}`;
  await SecureStore.deleteItemAsync(key);
}
