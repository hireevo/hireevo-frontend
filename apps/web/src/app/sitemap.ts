import type { MetadataRoute } from 'next';
import { env } from '@/env';

/**
 * Static routes only. Published profiles are added here from the search index
 * once there are any — reading them out of the API at request time would put an
 * unbounded query behind a public, uncached URL.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: env.NEXT_PUBLIC_SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}
