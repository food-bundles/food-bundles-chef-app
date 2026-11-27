/**
 * Passcode validation and security logic.
 */

const MIN_PASSCODE_LENGTH = 4;
const MAX_PASSCODE_LENGTH = 6;
const MAX_ATTEMPTS_BEFORE_LOCKOUT = 5;
const BASE_LOCKOUT_SECONDS = 30;

export interface PasscodeValidation {
  valid: boolean;
  errors: string[];
}

/**
 * Validate passcode format (4-6 digits).
 */
export function validatePasscode(passcode: string): PasscodeValidation {
  const errors: string[] = [];

  if (!passcode || passcode.length === 0) {
    errors.push('passcode_required');
  } else if (passcode.length < MIN_PASSCODE_LENGTH) {
    errors.push('passcode_too_short');
  } else if (passcode.length > MAX_PASSCODE_LENGTH) {
    errors.push('passcode_too_long');
  } else if (!/^\d+$/.test(passcode)) {
    errors.push('passcode_digits_only');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Check if lock is due based on last activity time and threshold.
 * @param lastActiveAt - Unix timestamp in milliseconds
 * @param now - Current Unix timestamp in milliseconds
 * @param thresholdMs - Inactivity threshold in milliseconds (default 30 minutes)
 */
export function isLockDue(
  lastActiveAt: number,
  now: number,
  thresholdMs: number = 30 * 60 * 1000
): boolean {
  if (lastActiveAt <= 0 || now <= 0) return false;
  if (now < lastActiveAt) return false; // Clock skew protection
  return now - lastActiveAt >= thresholdMs;
}

/**
 * Calculate lockout duration based on failed attempts.
 * Uses exponential backoff: 30s, 60s, 120s, 240s, 480s, then suggest OTP.
 */
export function getLockoutDuration(failedAttempts: number): number {
  if (failedAttempts < MAX_ATTEMPTS_BEFORE_LOCKOUT) return 0;
  
  const attemptsOverLimit = failedAttempts - MAX_ATTEMPTS_BEFORE_LOCKOUT + 1;
  return BASE_LOCKOUT_SECONDS * Math.pow(2, attemptsOverLimit - 1);
}

/**
 * Check if user is currently locked out.
 * @param failedAttempts - Number of consecutive failed attempts
 * @param lastFailedAt - Unix timestamp of last failed attempt in milliseconds
 * @param now - Current Unix timestamp in milliseconds
 */
export function isLockedOut(
  failedAttempts: number,
  lastFailedAt: number,
  now: number
): boolean {
  if (failedAttempts < MAX_ATTEMPTS_BEFORE_LOCKOUT) return false;
  
  const lockoutDuration = getLockoutDuration(failedAttempts);
  const lockoutEndsAt = lastFailedAt + lockoutDuration * 1000;
  
  return now < lockoutEndsAt;
}

/**
 * Calculate remaining lockout time in seconds.
 */
export function getRemainingLockoutTime(
  failedAttempts: number,
  lastFailedAt: number,
  now: number
): number {
  if (!isLockedOut(failedAttempts, lastFailedAt, now)) return 0;
  
  const lockoutDuration = getLockoutDuration(failedAttempts);
  const lockoutEndsAt = lastFailedAt + lockoutDuration * 1000;
  
  return Math.ceil((lockoutEndsAt - now) / 1000);
}

/**
 * Check if user should be offered OTP fallback (after too many failed attempts).
 */
export function shouldOfferOtpFallback(failedAttempts: number): boolean {
  return failedAttempts >= MAX_ATTEMPTS_BEFORE_LOCKOUT + 3; // After 8 total attempts
}
