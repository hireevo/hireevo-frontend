import type { MetadataRoute } from 'next';

/**
 * Static routes only. Published profiles are added here from the search index
 * once there are any — reading them out of the API at request time would put an
 * unbounded query behind a public, uncached URL.
 *
 * Empty until then. The root redirects to sign-in and every account screen is
 * `noindex`, and a sitemap listing a redirect or a page that asks not to be
 * indexed only teaches a crawler to distrust the rest of it.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [];
}
