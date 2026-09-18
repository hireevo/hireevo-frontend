import bundleAnalyzer from '@next/bundle-analyzer';
import type { NextConfig } from 'next';
import { env } from './src/env.ts';

// Importing the schema here is what makes a bad environment fail the build
// rather than the first request after a deploy. The value is validated for its
// own sake; the CSP that used to read it now lives in the middleware, where the
// per-request nonce is available.
new URL(env.NEXT_PUBLIC_API_URL);

/**
 * The Content-Security-Policy is not here.
 *
 * It carries a per-request nonce on `script-src`, so it is built in
 * `src/middleware.ts` (see `src/lib/csp.ts`), which is the only place a
 * per-request value can be set. The static headers below never change between
 * requests, so they stay in the config where Next applies them to every route.
 */
const securityHeaders = [
  // Redundant with the CSP's `frame-ancestors 'none'` for modern browsers, and
  // the only thing older ones understand.
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Nothing here needs a camera or a microphone yet. Verification video in Step
  // 1.7 will, and will add itself to this list deliberately.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const config: NextConfig = {
  reactStrictMode: true,
  // Workspace packages ship TypeScript source rather than a build output, so a
  // token or primitive change hot-reloads instead of needing a rebuild first.
  // @hireevo/api-client ships TypeScript source (its export is ./src/index.ts),
  // so it must be transpiled like the other workspace packages rather than
  // relied on to work only because a symlink happens to resolve.
  transpilePackages: ['@hireevo/tokens', '@hireevo/ui-web', '@hireevo/api-client'],
  typedRoutes: true,
  poweredByHeader: false,
  // Emits a self-contained server bundle so the runtime image carries the app
  // and nothing else — no workspace, no pnpm store, no dev dependencies. It is
  // opt-in because `next start` refuses to serve a standalone build: turning it
  // on unconditionally would leave `pnpm start` and the end-to-end suite
  // running against something the container does not run either.
  ...(process.env.NEXT_OUTPUT_STANDALONE === 'true'
    ? {
        output: 'standalone' as const,
        outputFileTracingRoot: new URL('../..', import.meta.url).pathname,
      }
    : {}),
  images: {
    formats: ['image/avif', 'image/webp'],
    // Media arrives from the API's storage host; the pattern is added with the
    // upload pipeline rather than guessed at now.
    remotePatterns: [],
  },
  headers: () => Promise.resolve([{ source: '/:path*', headers: securityHeaders }]),
};

export default bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })(config);
