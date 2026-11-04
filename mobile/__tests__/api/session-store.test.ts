/**
 * Session store tests.
 *
 * expo-secure-store is mocked so tests run in Node (no native module needed).
 * We test: JWT decode, token expiry logic, signIn/signOut, initSession restore,
 * and the TokenProvider adapter methods.
 */

// jest.mock must appear before imports — Jest hoists it to the top at runtime.
// eslint-disable-next-line import/first
const mockStore: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn((key: string) => Promise.resolve(mockStore[key] ?? null)),
  setItemAsync: jest.fn((key: string, value: string) => { mockStore[key] = value; return Promise.resolve(); }),
  deleteItemAsync: jest.fn((key: string) => { delete mockStore[key]; return Promise.resolve(); }),
}));

// eslint-disable-next-line import/first
import * as SecureStore from 'expo-secure-store';
// eslint-disable-next-line import/first
import { useSessionStore, sessionTokenProvider } from '@/store/session-store';

// ── JWT helpers ──────────────────────────────────────────────────────────────

function makeJwt(payload: object): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fakesig`;
}

const CHEF_ID = '00000000-0000-0000-0000-000000000001';

function validAccessToken(overrides: object = {}): string {
  return makeJwt({
    sub: CHEF_ID,
    exp: Math.floor(Date.now() / 1000) + 3600,
    type: 'access',
    ...overrides,
  });
}

function expiredAccessToken(): string {
  return makeJwt({
    sub: CHEF_ID,
    exp: Math.floor(Date.now() / 1000) - 100,
    type: 'access',
  });
}

function validRefreshToken(overrides: object = {}): string {
  return makeJwt({
    sub: CHEF_ID,
    exp: Math.floor(Date.now() / 1000) + 86400,
    type: 'refresh',
    ...overrides,
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function resetStore() {
  // Clear mock storage
  Object.keys(mockStore).forEach((k) => delete mockStore[k]);
  // Reset store to initial state
  useSessionStore.setState({
    chef: null,
    isAuthenticated: false,
    isRestoring: true,
  });
  jest.clearAllMocks();
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useSessionStore.signIn', () => {
  beforeEach(resetStore);

  it('sets isAuthenticated and chef after signIn', async () => {
    await useSessionStore.getState().signIn({
      accessToken: validAccessToken(),
      refreshToken: validRefreshToken(),
      chef: { id: CHEF_ID, phoneNumber: '+250788000001', name: 'Alice' },
    });

    const state = useSessionStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.chef?.id).toBe(CHEF_ID);
    expect(state.chef?.name).toBe('Alice');
  });

  it('persists tokens to SecureStore', async () => {
    const at = validAccessToken();
    const rt = validRefreshToken();
    await useSessionStore.getState().signIn({
      accessToken: at,
      refreshToken: rt,
      chef: { id: CHEF_ID, phoneNumber: '+250788000001', name: null },
    });

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('fb.chef.access_token', at);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('fb.chef.refresh_token', rt);
  });
});

describe('useSessionStore.signOut', () => {
  beforeEach(resetStore);

  it('clears isAuthenticated and chef', async () => {
    await useSessionStore.getState().signIn({
      accessToken: validAccessToken(),
      refreshToken: validRefreshToken(),
      chef: { id: CHEF_ID, phoneNumber: '+250788000001', name: null },
    });

    await useSessionStore.getState().signOut();

    const state = useSessionStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.chef).toBeNull();
  });

  it('deletes tokens from SecureStore on signOut', async () => {
    mockStore['fb.chef.access_token'] = validAccessToken();
    mockStore['fb.chef.refresh_token'] = validRefreshToken();

    await useSessionStore.getState().signOut();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('fb.chef.access_token');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('fb.chef.refresh_token');
  });
});

describe('useSessionStore.initSession', () => {
  beforeEach(resetStore);

  it('restores session when valid tokens exist in SecureStore', async () => {
    mockStore['fb.chef.access_token'] = validAccessToken();
    mockStore['fb.chef.refresh_token'] = validRefreshToken();

    await useSessionStore.getState().initSession();

    const state = useSessionStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.chef?.id).toBe(CHEF_ID);
    expect(state.isRestoring).toBe(false);
  });

  it('does not restore session when no tokens exist', async () => {
    await useSessionStore.getState().initSession();

    const state = useSessionStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isRestoring).toBe(false);
  });

  it('does not restore session when both tokens are expired', async () => {
    mockStore['fb.chef.access_token'] = expiredAccessToken();
    mockStore['fb.chef.refresh_token'] = makeJwt({
      sub: CHEF_ID,
      exp: Math.floor(Date.now() / 1000) - 100,
      type: 'refresh',
    });

    await useSessionStore.getState().initSession();

    const state = useSessionStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isRestoring).toBe(false);
  });

  it('still restores session when access token is expired but refresh token is valid', async () => {
    // http-client will transparently refresh on first API call
    mockStore['fb.chef.access_token'] = expiredAccessToken();
    mockStore['fb.chef.refresh_token'] = validRefreshToken();

    await useSessionStore.getState().initSession();

    const state = useSessionStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.isRestoring).toBe(false);
  });

  it('sets isRestoring to false even if SecureStore throws', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(new Error('keychain error'));

    await useSessionStore.getState().initSession();

    expect(useSessionStore.getState().isRestoring).toBe(false);
  });
});

describe('useSessionStore.onTokensRefreshed', () => {
  beforeEach(resetStore);

  it('persists new tokens and updates chef id', async () => {
    await useSessionStore.getState().signIn({
      accessToken: expiredAccessToken(),
      refreshToken: validRefreshToken(),
      chef: { id: CHEF_ID, phoneNumber: '+250788000001', name: null },
    });

    const newAt = validAccessToken();
    const newRt = validRefreshToken();
    await useSessionStore.getState().onTokensRefreshed(newAt, newRt);

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('fb.chef.access_token', newAt);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('fb.chef.refresh_token', newRt);
    expect(useSessionStore.getState().isAuthenticated).toBe(true);
  });
});

describe('sessionTokenProvider', () => {
  beforeEach(resetStore);

  it('getAccessToken reads from SecureStore', async () => {
    const at = validAccessToken();
    mockStore['fb.chef.access_token'] = at;
    expect(await sessionTokenProvider.getAccessToken()).toBe(at);
  });

  it('getRefreshToken reads from SecureStore', async () => {
    const rt = validRefreshToken();
    mockStore['fb.chef.refresh_token'] = rt;
    expect(await sessionTokenProvider.getRefreshToken()).toBe(rt);
  });

  it('onAuthFailure clears the session', async () => {
    await useSessionStore.getState().signIn({
      accessToken: validAccessToken(),
      refreshToken: validRefreshToken(),
      chef: { id: CHEF_ID, phoneNumber: '+250788000001', name: null },
    });

    await sessionTokenProvider.onAuthFailure();

    expect(useSessionStore.getState().isAuthenticated).toBe(false);
  });
});
