import { createApiClient } from '@hireevo/api-client';
import { env } from '@/env';
import { getAccessToken } from './access-token.ts';

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
