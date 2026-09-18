import { env } from '../env';

// The API is the one cross-origin the app talks to; everything else is same
// origin. Computed once from the validated environment.
const apiOrigin = new URL(env.NEXT_PUBLIC_API_URL).origin;

/**
 * The Content-Security-Policy for a single request.
 *
 * The policy is built per request rather than once at config time because the
 * `script-src` directive carries a per-request nonce: only a script this server
 * stamped with the nonce may run, and — through `strict-dynamic` — only the
 * scripts those trusted scripts go on to load. That is what lets the policy drop
 * `'unsafe-inline'` for scripts, which is the one real gap a static policy left
 * open. The middleware generates the nonce, hands it to Next so every script tag
 * it emits carries it, and puts this header on the response.
 *
 * `'unsafe-eval'` and the websocket schemes are allowed only outside production,
 * where React's development build and the dev server's live-reload socket need
 * them; the production policy omits both, and `security-headers.spec.ts` asserts
 * it does.
 */
export function buildContentSecurityPolicy(nonce: string): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const developmentOnly = {
    script: isProduction ? '' : " 'unsafe-eval'",
    connect: isProduction ? '' : ' ws: wss:',
  };

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    // The nonce is the whole point. `'strict-dynamic'` makes browsers that
    // understand it ignore `'self'` and any host list and trust only what a
    // nonced script loads, so no `'unsafe-inline'` is needed for scripts;
    // `'self'` stays as a fallback for older engines.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${developmentOnly.script}`,
    // Styles still allow inline: Next ships critical CSS and styled-jsx inline
    // without a nonce, and injecting a stylesheet is not script execution.
    // Tightening this is a separate change in how styles are delivered.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https:",
    "font-src 'self' data:",
    `connect-src 'self' ${apiOrigin}${developmentOnly.connect}`,
    "manifest-src 'self'",
    // Production only. Safari applies this to `http://localhost` too, rewriting
    // every asset to an `https` address the dev server does not answer, so the
    // page renders unstyled in Safari and nowhere else. Production is served
    // over TLS, where the directive does its job.
    ...(isProduction ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}
