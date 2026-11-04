import { request } from './http-client';

// ── Request / response DTOs ─────────────────────────────────────────────────

export interface OtpRequestBody {
  phone_number: string;
}

export interface OtpRequestResponse {
  message: string;
  expires_in_seconds: number;
}

export interface OtpVerifyBody {
  phone_number: string;
  code: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface RefreshBody {
  refresh_token: string;
}

export interface ChefProfile {
  id: string;
  phone_number: string;
  name: string | null;
  expo_push_token: string | null;
  created_at: string;
}

export interface PushTokenBody {
  token: string;
}

// ── API calls ───────────────────────────────────────────────────────────────

/**
 * Request an OTP to be sent via SMS to the given phone number.
 * Rate-limited: 5 requests per 15 minutes per IP.
 */
export function requestOtp(body: OtpRequestBody): Promise<OtpRequestResponse> {
  return request<OtpRequestResponse>('/auth/otp/request', {
    method: 'POST',
    body,
    skipAuth: true,
  });
}

/**
 * Verify a 6-digit OTP. Returns access + refresh tokens on success.
 * Rate-limited: 10 requests per 15 minutes per IP.
 */
export function verifyOtp(body: OtpVerifyBody): Promise<TokenResponse> {
  return request<TokenResponse>('/auth/otp/verify', {
    method: 'POST',
    body,
    skipAuth: true,
  });
}

/**
 * Exchange a refresh token for new access + refresh tokens.
 * Rate-limited: 30 requests per minute.
 * skipRefresh=true prevents infinite recursion if this call returns 401.
 */
export function refreshToken(body: RefreshBody): Promise<TokenResponse> {
  return request<TokenResponse>('/auth/token/refresh', {
    method: 'POST',
    body,
    skipAuth: true,
    skipRefresh: true,
  });
}

/**
 * Invalidate the given refresh token. Best-effort — always clears local session.
 */
export function logout(body: RefreshBody): Promise<void> {
  return request<void>('/auth/logout', {
    method: 'POST',
    body,
    skipRefresh: true,
  });
}

/**
 * Fetch the authenticated chef's profile. Used after login to populate session.
 */
export function getMe(): Promise<ChefProfile> {
  return request<ChefProfile>('/auth/me');
}

/**
 * Register or update the Expo push token for the authenticated chef.
 */
export function registerPushToken(body: PushTokenBody): Promise<void> {
  return request<void>('/auth/me/push-token', {
    method: 'PUT',
    body,
  });
}
