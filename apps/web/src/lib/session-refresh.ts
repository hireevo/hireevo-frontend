import type { AuthenticatedUser } from '@hireevo/api-client';
import { env } from '@/env';
import { setAccessToken } from './access-token.ts';

export type RefreshResult = { accessToken: string; user: AuthenticatedUser } | null;

/**
 * Spends the refresh cookie for a new access token — once, however many callers
 * ask at the same moment.
 *
 * Two things used to send a second, self-defeating refresh: React StrictMode
 * runs the mount effect twice in development, and several requests can get a 401
 * together. A refresh token is single-use, so the second call presents an
 * already-rotated token, which the API reads as a replay and revokes the whole
 * family — signing the user out. This collapses all of them into one request:
 * `inFlight` shares the promise within a tab, and a Web Lock serialises tabs, so
 * a second tab opening at the same time waits for the first rather than racing
 * it.
 *
 * It calls the endpoint with a bare `fetch`, not the API client, so it never
 * passes through the 401-retry middleware that itself calls this — no recursion,
 * no circular import.
 */
let inFlight: Promise<RefreshResult> | null = null;

const sessionEndedListeners = new Set<() => void>();

/** Called when a refresh fails, so the React session can turn anonymous. */
export function onSessionEnded(listener: () => void): () => void {
  sessionEndedListeners.add(listener);
  return () => sessionEndedListeners.delete(listener);
}

export function notifySessionEnded(): void {
  for (const listener of sessionEndedListeners) listener();
}

async function requestRefresh(): Promise<RefreshResult> {
  try {
    const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json', 'x-client-platform': 'web' },
      body: '{}',
    });

    if (!response.ok) {
      setAccessToken(null);
      return null;
    }

    const data = (await response.json()) as { accessToken?: unknown; user?: unknown };
    if (typeof data.accessToken === 'string' && data.user != null) {
      setAccessToken(data.accessToken);
      return { accessToken: data.accessToken, user: data.user as AuthenticatedUser };
    }

    setAccessToken(null);
    return null;
  } catch {
    // A dropped connection is not proof the session ended; the token is cleared
    // and the caller falls back to anonymous, and the next navigation retries.
    setAccessToken(null);
    return null;
  }
}

function withCrossTabLock(): Promise<RefreshResult> {
  if (typeof navigator !== 'undefined' && navigator.locks !== undefined) {
    return navigator.locks.request('hireevo:refresh', requestRefresh);
  }
  return requestRefresh();
}

export function refreshSession(): Promise<RefreshResult> {
  inFlight ??= withCrossTabLock().finally(() => {
    inFlight = null;
  });
  return inFlight;
}
