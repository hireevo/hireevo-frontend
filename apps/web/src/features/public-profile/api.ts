import { createApiClient, type Schema } from '@hireevo/api-client';
import { env } from '@/env';

export type PublicProfile = Schema<'PublicProfileResponse'>;

/**
 * The client this page reads through: no access token, because there is nobody
 * signed in to have one.
 *
 * Its own instance rather than the app's singleton, which reads the browser's
 * token — on the server there is none to read, and a public profile is public.
 */
const api = createApiClient({ baseUrl: env.NEXT_PUBLIC_API_URL });

/**
 * A published profile by its slug, or null when there is none.
 *
 * Null means the API said 404, which it also says for a draft, a suspended
 * profile and one switched back to private — deliberately, so a slug cannot be
 * used to find out which. Anything else throws: a profile that exists and could
 * not be fetched is an error, not a missing page.
 */
export async function fetchPublicProfile(slug: string): Promise<PublicProfile | null> {
  const { data, response } = await api.GET('/api/v1/profiles/{slug}', {
    params: { path: { slug } },
  });

  if (data !== undefined) return data;
  if (response.status === 404) return null;
  throw new Error(`The profile at ${slug} could not be loaded (${response.status})`);
}
