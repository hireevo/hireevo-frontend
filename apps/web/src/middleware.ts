import { NextResponse, type NextRequest } from 'next/server';

import { buildContentSecurityPolicy } from './lib/csp';

/**
 * Attaches a per-request CSP nonce.
 *
 * A fresh nonce is generated for every document request, written into the
 * request headers so Next stamps it onto every script tag it renders, and put on
 * the `Content-Security-Policy` response header so the browser only runs scripts
 * carrying it. Because the nonce differs per response, pages the matcher covers
 * render dynamically rather than being served as prebuilt HTML — the deliberate
 * cost of a nonce-based policy, taken because the alternative is `'unsafe-inline'`
 * on `script-src`.
 */
export function middleware(request: NextRequest): NextResponse {
  // 128 bits of randomness, base64-encoded. `crypto` and `btoa` are both part
  // of the edge runtime, so this needs no Node APIs.
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
  const csp = buildContentSecurityPolicy(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  // Next reads the nonce out of the request's CSP header and applies it to the
  // script tags it emits; without this it would not know the nonce.
  requestHeaders.set('content-security-policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('content-security-policy', csp);
  return response;
}

export const config = {
  matcher: [
    // Every document, but not the fingerprinted static assets, the image
    // optimiser or the manifest: none of them execute scripts, all of them are
    // requested on every page, and a prefetch must not burn a nonce that the
    // real navigation would then mismatch.
    {
      source: '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
