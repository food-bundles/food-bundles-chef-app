import { getRandomBytes } from 'expo-crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const SECRET_LENGTH = 16;
const TIME_STEP_MS = 30000;

/** Generates a mock 16-character base32 TOTP secret using CSPRNG bytes. */
export function generateTotpSecret(): string {
  const bytes = getRandomBytes(SECRET_LENGTH);
  let secret = '';
  for (let i = 0; i < SECRET_LENGTH; i += 1) {
    secret += BASE32_ALPHABET[bytes[i] % BASE32_ALPHABET.length];
  }
  return secret;
}

/** Builds the otpauth:// URI an authenticator app scans to add this account. */
export function buildOtpauthUri(secret: string, accountLabel: string, issuer = 'FoodBundles'): string {
  const label = encodeURIComponent(`${issuer}:${accountLabel}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
}

function mockHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Deterministically derives the expected 6-digit code for a secret at the current 30s time window. */
export function currentMockTotpCode(secret: string): string {
  const timeWindow = Math.floor(Date.now() / TIME_STEP_MS);
  const code = mockHash(`${secret}:${timeWindow}`) % 1000000;
  return String(code).padStart(6, '0');
}

/** Mock TOTP validation — not RFC 6238 correct, but matches currentMockTotpCode for the same secret. */
export function validateTotp(secret: string, code: string): boolean {
  return code.length === 6 && code === currentMockTotpCode(secret);
}
