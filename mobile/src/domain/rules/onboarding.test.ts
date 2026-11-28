import { describe, it, expect } from '@jest/globals';
import {
  getNextOnboardingStep,
  isOnboardingComplete,
  validateProfileData,
  type OnboardingState,
} from './onboarding';

describe('onboarding rules', () => {
  describe('getNextOnboardingStep', () => {
    it('returns profile when nothing complete', () => {
      const state: OnboardingState = {
        profileComplete: false,
        kitchenComplete: false,
        languageComplete: false,
      };
      expect(getNextOnboardingStep(state)).toBe('profile');
    });

    it('returns kitchen when only profile complete', () => {
      const state: OnboardingState = {
        profileComplete: true,
        kitchenComplete: false,
        languageComplete: false,
      };
      expect(getNextOnboardingStep(state)).toBe('kitchen');
    });

    it('returns language when profile and kitchen complete', () => {
      const state: OnboardingState = {
        profileComplete: true,
        kitchenComplete: true,
        languageComplete: false,
      };
      expect(getNextOnboardingStep(state)).toBe('language');
    });

    it('returns complete when all steps done', () => {
      const state: OnboardingState = {
        profileComplete: true,
        kitchenComplete: true,
        languageComplete: true,
      };
      expect(getNextOnboardingStep(state)).toBe('complete');
    });
  });

  describe('isOnboardingComplete', () => {
    it('returns false when any step incomplete', () => {
      expect(
        isOnboardingComplete({
          profileComplete: false,
          kitchenComplete: true,
          languageComplete: true,
        })
      ).toBe(false);
    });

    it('returns true when all steps complete', () => {
      expect(
        isOnboardingComplete({
          profileComplete: true,
          kitchenComplete: true,
          languageComplete: true,
        })
      ).toBe(true);
    });
  });

  describe('validateProfileData', () => {
    it('requires name', () => {
      const result = validateProfileData({ name: null });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('name_required');
    });

    it('requires non-empty name', () => {
      const result = validateProfileData({ name: '   ' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('name_required');
    });

    it('requires name at least 2 chars', () => {
      const result = validateProfileData({ name: 'A' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('name_too_short');
    });

    it('requires name max 200 chars', () => {
      const result = validateProfileData({ name: 'A'.repeat(201) });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('name_too_long');
    });

    it('accepts valid name', () => {
      const result = validateProfileData({ name: 'John Chef' });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });
});
