/**
 * Onboarding flow logic and state management.
 */

export type OnboardingStep = 'profile' | 'kitchen' | 'language' | 'complete';

export interface OnboardingState {
  profileComplete: boolean;
  kitchenComplete: boolean;
  languageComplete: boolean;
}

/**
 * Determine the next onboarding step based on current state.
 */
export function getNextOnboardingStep(state: OnboardingState): OnboardingStep {
  if (!state.profileComplete) return 'profile';
  if (!state.kitchenComplete) return 'kitchen';
  if (!state.languageComplete) return 'language';
  return 'complete';
}

/**
 * Check if onboarding is complete.
 */
export function isOnboardingComplete(state: OnboardingState): boolean {
  return state.profileComplete && state.kitchenComplete && state.languageComplete;
}

/**
 * Validate profile data for onboarding.
 */
export function validateProfileData(data: {
  name: string | null;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.name || data.name.trim().length === 0) {
    errors.push('name_required');
  }

  if (data.name && data.name.trim().length < 2) {
    errors.push('name_too_short');
  }

  if (data.name && data.name.trim().length > 200) {
    errors.push('name_too_long');
  }

  return { valid: errors.length === 0, errors };
}
