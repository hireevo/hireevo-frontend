import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HireEvo',
    short_name: 'HireEvo',
    description: 'Build a credible professional profile and be found.',
    start_url: '/',
    display: 'standalone',
    // Matches the light `surface` and `accent` tokens. These are literals
    // because a manifest is JSON: it cannot read a custom property.
    background_color: '#ffffff',
    theme_color: '#15423c',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
