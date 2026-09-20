import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/env', () => ({ env: { NEXT_PUBLIC_API_URL: 'http://api.test' } }));

import { getAccessToken, setAccessToken } from './access-token.ts';
import { notifySessionEnded, onSessionEnded, refreshSession } from './session-refresh.ts';

const fetchMock = vi.fn();

describe('refreshSession', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    setAccessToken(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('spends the cookie once for callers that arrive together', async () => {
    // StrictMode's double mount and several 401s at once must not each rotate
    // the single-use token — that is what revoked the family and signed the
    // user out.
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ accessToken: 'tok', user: { id: 'u1' } }),
    });

    const [first, second] = await Promise.all([refreshSession(), refreshSession()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first).toEqual(second);
    expect(first?.accessToken).toBe('tok');
    expect(getAccessToken()).toBe('tok');
  });

  it('returns null and clears the token when the refresh is refused', async () => {
    setAccessToken('stale');
    fetchMock.mockResolvedValue({ ok: false, json: () => Promise.resolve({}) });

    expect(await refreshSession()).toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it('runs a fresh refresh once the previous one has settled', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ accessToken: 't1', user: { id: 'u1' } }),
    });
    await refreshSession();

    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ accessToken: 't2', user: { id: 'u1' } }),
    });
    const second = await refreshSession();

    expect(second?.accessToken).toBe('t2');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('tells listeners once when the session ends, until they unsubscribe', () => {
    const listener = vi.fn();
    const stop = onSessionEnded(listener);

    notifySessionEnded();
    expect(listener).toHaveBeenCalledOnce();

    stop();
    notifySessionEnded();
    expect(listener).toHaveBeenCalledOnce();
  });
});
