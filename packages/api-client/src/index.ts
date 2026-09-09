import createClient, { type Middleware } from 'openapi-fetch';
import type { components, paths } from './schema.d.ts';

export type { components, paths } from './schema.d.ts';

/** Shorthand for a schema the API publishes, e.g. `Schema<'AuthTokensResponse'>`. */
export type Schema<Name extends keyof components['schemas']> = components['schemas'][Name];

export type AuthenticatedUser = Schema<'AuthenticatedUser'>;
export type AuthTokens = Schema<'AuthTokensResponse'>;

/** The envelope every failing request returns, whatever the status. */
export type ApiErrorBody = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  requestId: string;
};

export type ApiClient = ReturnType<typeof createApiClient>;

export type ApiClientOptions = {
  /** The API's base URL, including its version prefix. */
  baseUrl: string;
  /**
   * The current access token, read fresh on every request.
   *
   * A getter rather than a value because the token is rotated while the client
   * lives: passing the string once would pin the first one it ever saw.
   */
  getAccessToken?: () => string | null;
};

/**
 * The typed client every caller uses.
 *
 * Two things are set on every request and are the reason this is a factory
 * rather than bare `fetch` calls:
 *
 * `credentials: 'include'` sends the refresh cookie. The API and the web app sit
 * on different ports locally and on sibling subdomains in production — different
 * origins, but the same site — so the cookie travels with a cross-origin request
 * as long as the request asks for it and the API allows credentials.
 *
 * `x-client-platform: web` is what tells the API to deliver the refresh token as
 * an httpOnly cookie and leave it out of the response body. Without it the API
 * would hand the token to JavaScript, which is the one place a long-lived
 * credential must not be.
 */
export function createApiClient({ baseUrl, getAccessToken }: ApiClientOptions) {
  const client = createClient<paths>({
    baseUrl,
    credentials: 'include',
    headers: { 'x-client-platform': 'web' },
  });

  const auth: Middleware = {
    onRequest({ request }) {
      const token = getAccessToken?.() ?? null;
      if (token !== null) {
        request.headers.set('authorization', `Bearer ${token}`);
      }
      return request;
    },
  };

  client.use(auth);
  return client;
}

/**
 * Narrows whatever a failed call returned to the error envelope.
 *
 * A request can also fail before the API is reached — a dropped connection, a
 * proxy returning HTML — so the shape is checked rather than asserted, and the
 * caller gets a usable message either way.
 */
export function toApiError(error: unknown): ApiErrorBody | null {
  if (typeof error !== 'object' || error === null) return null;
  const envelope = (error as { error?: unknown }).error;
  if (typeof envelope !== 'object' || envelope === null) return null;

  const { code, message, requestId, details } = envelope as Record<string, unknown>;
  if (typeof code !== 'string' || typeof message !== 'string') return null;

  return {
    code,
    message,
    requestId: typeof requestId === 'string' ? requestId : '',
    ...(typeof details === 'object' && details !== null
      ? { details: details as Record<string, unknown> }
      : {}),
  };
}

/** A validation issue as the API reports it, so a form can blame the right field. */
export type ApiFieldIssue = { path: string; code: string; message: string };

/**
 * Pulls per-field validation issues out of an error envelope.
 *
 * The API reports which field failed and why; without this the form would show
 * one banner for what is really four separate corrections.
 */
export function toFieldIssues(error: unknown): ApiFieldIssue[] {
  const issues = toApiError(error)?.details?.['issues'];
  if (!Array.isArray(issues)) return [];

  return issues.flatMap((issue) => {
    if (typeof issue !== 'object' || issue === null) return [];
    const { path, code, message } = issue as Record<string, unknown>;
    if (typeof path !== 'string' || typeof message !== 'string') return [];
    return [{ path, code: typeof code === 'string' ? code : 'invalid', message }];
  });
}
