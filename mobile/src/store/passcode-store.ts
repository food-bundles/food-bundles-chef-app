import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const PASSCODE_HASH_KEY = 'fb.chef.passcode_hash';
const PASSCODE_SALT_KEY = 'fb.chef.passcode_salt';
const FAILED_ATTEMPTS_KEY = 'fb.chef.passcode_failed_attempts';
const LAST_FAILED_AT_KEY = 'fb.chef.passcode_last_failed_at';
const PASSCODE_SUGGESTION_SHOWN_KEY = 'fb.chef.passcode_suggestion_shown';
const PBKDF2_ITERATIONS = 10000;

/**
 * Generate a random salt for passcode hashing.
 */
async function generateSalt(): Promise<string> {
  const randomBytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash passcode with salt using PBKDF2 with 10,000 iterations.
 * Uses repeated SHA-256 as PBKDF2 approximation since expo-crypto doesn't have PBKDF2.
 */
async function hashPasscode(passcode: string, salt: string): Promise<string> {
  let hash = passcode + salt;

  // Perform 10,000 rounds of SHA-256 hashing for PBKDF2-like security
  for (let i = 0; i < PBKDF2_ITERATIONS; i++) {
    hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, hash);
  }

  return hash;
}

/**
 * Set a new passcode for the chef. Stores salted hash only.
 */
export async function setPasscode(chefId: string, passcode: string): Promise<void> {
  const salt = await generateSalt();
  const hash = await hashPasscode(passcode, salt);

  await Promise.all([
    SecureStore.setItemAsync(`${PASSCODE_HASH_KEY}.${chefId}`, hash),
    SecureStore.setItemAsync(`${PASSCODE_SALT_KEY}.${chefId}`, salt),
  ]);

  // Reset failed attempts when setting new passcode
  await clearFailedAttempts(chefId);
}

/**
 * Verify a passcode against the stored hash.
 */
export async function verifyPasscode(chefId: string, passcode: string): Promise<boolean> {
  try {
    const [hash, salt] = await Promise.all([
      SecureStore.getItemAsync(`${PASSCODE_HASH_KEY}.${chefId}`),
      SecureStore.getItemAsync(`${PASSCODE_SALT_KEY}.${chefId}`),
    ]);

    if (!hash || !salt) return false;

    const computedHash = await hashPasscode(passcode, salt);
    return computedHash === hash;
  } catch {
    return false;
  }
}

/**
 * Check if chef has a passcode set.
 */
export async function hasPasscode(chefId: string): Promise<boolean> {
  try {
    const hash = await SecureStore.getItemAsync(`${PASSCODE_HASH_KEY}.${chefId}`);
    return hash !== null;
  } catch {
    return false;
  }
}

/**
 * Remove passcode for chef.
 */
export async function removePasscode(chefId: string): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(`${PASSCODE_HASH_KEY}.${chefId}`),
    SecureStore.deleteItemAsync(`${PASSCODE_SALT_KEY}.${chefId}`),
  ]);
  await clearFailedAttempts(chefId);
}

/**
 * Record a failed passcode attempt.
 */
export async function recordFailedAttempt(chefId: string): Promise<number> {
  const attempts = await getFailedAttempts(chefId);
  const newAttempts = attempts + 1;

  await Promise.all([
    SecureStore.setItemAsync(`${FAILED_ATTEMPTS_KEY}.${chefId}`, String(newAttempts)),
    SecureStore.setItemAsync(`${LAST_FAILED_AT_KEY}.${chefId}`, String(Date.now())),
  ]);

  return newAttempts;
}

/**
 * Get number of failed passcode attempts.
 */
export async function getFailedAttempts(chefId: string): Promise<number> {
  try {
    const value = await SecureStore.getItemAsync(`${FAILED_ATTEMPTS_KEY}.${chefId}`);
    return value ? parseInt(value, 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * Get timestamp of last failed attempt.
 */
export async function getLastFailedAt(chefId: string): Promise<number> {
  try {
    const value = await SecureStore.getItemAsync(`${LAST_FAILED_AT_KEY}.${chefId}`);
    return value ? parseInt(value, 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * Clear failed attempt counters (after successful unlock or passcode reset).
 */
export async function clearFailedAttempts(chefId: string): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(`${FAILED_ATTEMPTS_KEY}.${chefId}`),
    SecureStore.deleteItemAsync(`${LAST_FAILED_AT_KEY}.${chefId}`),
  ]);
}

/**
 * Check if passcode setup suggestion has been shown.
 */
export async function hasShownPasscodeSuggestion(chefId: string): Promise<boolean> {
  try {
    const value = await SecureStore.getItemAsync(`${PASSCODE_SUGGESTION_SHOWN_KEY}.${chefId}`);
    return value === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark passcode suggestion as shown.
 */
export async function markPasscodeSuggestionShown(chefId: string): Promise<void> {
  await SecureStore.setItemAsync(`${PASSCODE_SUGGESTION_SHOWN_KEY}.${chefId}`, 'true');
}
