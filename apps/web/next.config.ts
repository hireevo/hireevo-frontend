import bundleAnalyzer from '@next/bundle-analyzer';
import type { NextConfig } from 'next';
import { env } from './src/env.ts';

// Importing the schema here is what makes a bad environment fail the build
// rather than the first request after a deploy.
const apiOrigin = new URL(env.NEXT_PUBLIC_API_URL).origin;

/**
 * Content Security Policy.
 *
 * The strict form of this policy uses a per-request nonce, which means every
 * page is rendered dynamically — Next cannot prerender HTML containing a value
 * that has to differ on each response. The public marketing pages and profile
 * routes are the ones this product is found through, so trading their static
 * rendering away is not free, and the decision belongs with those pages rather
 * than with a scaffold.
 *
 * What is enforced below therefore omits the nonce and keeps `'unsafe-inline'`
 * for scripts, which is the one real gap. Everything else a CSP buys is here
 * and costs nothing: no third-party script origin, no plugins, no framing, no
 * form posting to another host, no `<base>` hijack. Tightening `script-src`
 * means adding the nonce middleware and accepting dynamic rendering, and is
 * tracked as its own change.
 */
const isProduction = process.env.NODE_ENV === 'production';

// React's development build calls `eval()` to rebuild a callstack that crossed
// an environment boundary, and the dev server talks to the browser over a
// websocket. Neither exists in a production bundle, so both are allowed only
// while NODE_ENV is not production — and a test below asserts that the shipped
// policy really does omit them.
const developmentOnly = {
  script: isProduction ? '' : " 'unsafe-eval'",
  connect: isProduction ? '' : ' ws: wss:',
};

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline'${developmentOnly.script}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin}${developmentOnly.connect}`,
  "manifest-src 'self'",
  // Production only. Safari applies this to `http://localhost` too, rewriting
  // every stylesheet, script and image to an `https` address the dev server
  // does not answer — so in development the page renders unstyled, with broken
  // images, in Safari and nowhere else. Production is served over TLS, where the
  // directive does its job.
  ...(isProduction ? ['upgrade-insecure-requests'] : []),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  // Redundant with `frame-ancestors` for modern browsers, and the only thing
  // older ones understand.
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
