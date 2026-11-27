import { describe, it, expect } from '@jest/globals';
import {
  validatePasscode,
  isLockDue,
  getLockoutDuration,
  isLockedOut,
  getRemainingLockoutTime,
  shouldOfferOtpFallback,
} from './passcode';

describe('passcode validation', () => {
  describe('validatePasscode', () => {
    it('requires passcode', () => {
      const result = validatePasscode('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('passcode_required');
    });

    it('requires at least 4 digits', () => {
      const result = validatePasscode('123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('passcode_too_short');
    });

    it('requires at most 6 digits', () => {
      const result = validatePasscode('1234567');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('passcode_too_long');
    });

    it('requires digits only', () => {
      const result = validatePasscode('12a4');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('passcode_digits_only');
    });

    it('accepts 4 digits', () => {
      const result = validatePasscode('1234');
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('accepts 5 digits', () => {
      const result = validatePasscode('12345');
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('accepts 6 digits', () => {
      const result = validatePasscode('123456');
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('isLockDue', () => {
    const now = Date.now();
    const thirtyMinutes = 30 * 60 * 1000;

    it('returns false when no time has passed', () => {
      expect(isLockDue(now, now, thirtyMinutes)).toBe(false);
    });

    it('returns false when less than threshold', () => {
      const lastActive = now - (29 * 60 * 1000); // 29 minutes ago
      expect(isLockDue(lastActive, now, thirtyMinutes)).toBe(false);
    });

    it('returns true when exactly at threshold', () => {
      const lastActive = now - thirtyMinutes;
      expect(isLockDue(lastActive, now, thirtyMinutes)).toBe(true);
    });

    it('returns true when past threshold', () => {
      const lastActive = now - (31 * 60 * 1000); // 31 minutes ago
      expect(isLockDue(lastActive, now, thirtyMinutes)).toBe(true);
    });

    it('handles clock skew protection', () => {
      const future = now + 1000;
      expect(isLockDue(future, now, thirtyMinutes)).toBe(false);
    });

    it('returns false for invalid timestamps', () => {
      expect(isLockDue(0, now, thirtyMinutes)).toBe(false);
      expect(isLockDue(now, 0, thirtyMinutes)).toBe(false);
      expect(isLockDue(-1, now, thirtyMinutes)).toBe(false);
    });
  });

  describe('getLockoutDuration', () => {
    it('returns 0 for less than 5 attempts', () => {
      expect(getLockoutDuration(0)).toBe(0);
      expect(getLockoutDuration(4)).toBe(0);
    });

    it('returns 30s for 5th attempt', () => {
      expect(getLockoutDuration(5)).toBe(30);
    });

    it('doubles each time (exponential backoff)', () => {
      expect(getLockoutDuration(5)).toBe(30);
      expect(getLockoutDuration(6)).toBe(60);
      expect(getLockoutDuration(7)).toBe(120);
      expect(getLockoutDuration(8)).toBe(240);
      expect(getLockoutDuration(9)).toBe(480);
    });
  });

  describe('isLockedOut', () => {
    const now = Date.now();

    it('returns false for less than 5 attempts', () => {
      expect(isLockedOut(4, now, now)).toBe(false);
    });

    it('returns true immediately after 5th attempt', () => {
      expect(isLockedOut(5, now, now)).toBe(true);
    });

    it('returns true during lockout period', () => {
      const lastFailed = now - 15000; // 15 seconds ago
      expect(isLockedOut(5, lastFailed, now)).toBe(true); // 30s lockout
    });

    it('returns false after lockout period expires', () => {
      const lastFailed = now - 31000; // 31 seconds ago
      expect(isLockedOut(5, lastFailed, now)).toBe(false); // 30s lockout expired
    });

    it('handles longer lockouts for more attempts', () => {
      const lastFailed = now - 45000; // 45 seconds ago
      expect(isLockedOut(6, lastFailed, now)).toBe(true); // 60s lockout, still locked
      expect(isLockedOut(6, now - 61000, now)).toBe(false); // 61s ago, unlocked
    });
  });

  describe('getRemainingLockoutTime', () => {
    const now = Date.now();

    it('returns 0 when not locked out', () => {
      expect(getRemainingLockoutTime(4, now, now)).toBe(0);
    });

    it('returns remaining seconds during lockout', () => {
      const lastFailed = now - 15000; // 15 seconds ago, 30s lockout
      const remaining = getRemainingLockoutTime(5, lastFailed, now);
      expect(remaining).toBe(15); // 15 seconds remaining
    });

    it('rounds up to nearest second', () => {
      const lastFailed = now - 14500; // 14.5 seconds ago
      const remaining = getRemainingLockoutTime(5, lastFailed, now);
      expect(remaining).toBe(16); // rounds up to 16
    });

    it('returns 0 when lockout expires', () => {
      const lastFailed = now - 31000; // 31 seconds ago
      expect(getRemainingLockoutTime(5, lastFailed, now)).toBe(0);
    });
  });

  describe('shouldOfferOtpFallback', () => {
    it('returns false for few attempts', () => {
      expect(shouldOfferOtpFallback(5)).toBe(false);
      expect(shouldOfferOtpFallback(7)).toBe(false);
    });

    it('returns true after 8 attempts', () => {
      expect(shouldOfferOtpFallback(8)).toBe(true);
      expect(shouldOfferOtpFallback(10)).toBe(true);
    });
  });
});
