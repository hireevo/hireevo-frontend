import { createApiClient } from '@hireevo/api-client';
import { env } from '@/env';
import { getAccessToken } from './access-token.ts';
import { notifySessionEnded, refreshSession } from './session-refresh.ts';

/**
 * The one client the app talks to the API through.
 *
 * It is a module singleton so that every caller shares the same access token
 * getter; the token itself is not captured here, it is read on each request.
 */
export const api = createApiClient({
  baseUrl: env.NEXT_PUBLIC_API_URL,
  getAccessToken,
});

/** The API's own auth endpoints: a 401 from here is a real failure, not an expiry. */
const AUTH_PREFIX = '/api/v1/auth/';

/**
 * A copy of each request taken before it is sent, so a 401 can be replayed with
 * a fresh token. The original request's body is a stream `fetch` consumes, so it
 * cannot be sent twice; the clone, never sent, still can.
 */
const pristine = new WeakMap<Request, Request>();

/**
 * Recover from an expired access token.
 *
 * The token lives ten minutes; a longer-lived tab then gets a 401 on an
 * ordinary call. Rather than surface that to the screen — which left `/account`
 * stuck on "Loading" — this refreshes once (single-flighted with every other
 * 401 and the mount restore) and replays the request with the new token. If the
 * refresh fails the session has genuinely ended, so the client is told to turn
 * anonymous and the original 401 stands.
 */
api.use({
  onRequest({ request }) {
    pristine.set(request, request.clone());
    return request;
  },
  async onResponse({ request, response }) {
    if (response.status !== 401) return undefined;

    // A 401 from login, refresh or logout is the answer, not an expiry to retry.
    if (new URL(request.url).pathname.startsWith(AUTH_PREFIX)) return undefined;

    const original = pristine.get(request);
    if (original === undefined) return undefined;

    const refreshed = await refreshSession();
    if (refreshed === null) {
      notifySessionEnded();
      return undefined;
    }

    // A bare fetch, so the replay does not re-enter this middleware; a second
    // 401 is returned as-is rather than retried again.
    const replay = new Request(original, { headers: new Headers(original.headers) });
    replay.headers.set('authorization', `Bearer ${refreshed.accessToken}`);
    return fetch(replay);
  },
});
