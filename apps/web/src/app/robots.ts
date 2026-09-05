import type { MetadataRoute } from 'next';
import { env } from '@/env';

export default function robots(): MetadataRoute.Robots {
  const isProduction = new URL(env.NEXT_PUBLIC_SITE_URL).hostname === 'hireevo.com';

  // Preview and staging deployments must never be indexed. A staging copy of a
  // freelancer's profile ranking alongside the real one is a privacy problem,
  // not just an SEO one.
  if (!isProduction) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/design-system'] }],
    sitemap: `${env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
