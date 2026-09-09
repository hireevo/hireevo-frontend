import { expect, test } from '@playwright/test';

// Headers configured but never asserted are headers that quietly disappear in a
// refactor, so the policy is pinned here rather than only in next.config.ts.
const EXPECTED: Array<[header: string, contains: string]> = [
  ['x-frame-options', 'DENY'],
  ['x-content-type-options', 'nosniff'],
  ['referrer-policy', 'strict-origin-when-cross-origin'],
  ['strict-transport-security', 'max-age=63072000'],
  ['cross-origin-opener-policy', 'same-origin'],
  ['permissions-policy', 'camera=()'],
  ['content-security-policy', "frame-ancestors 'none'"],
  ['content-security-policy', "object-src 'none'"],
  ['content-security-policy', "base-uri 'self'"],
  ['content-security-policy', "form-action 'self'"],
];

test('the document response carries the security headers', async ({ request }) => {
  const response = await request.get('/');
  const headers = response.headers();

  for (const [header, contains] of EXPECTED) {
    expect(headers[header] ?? '', `${header} is missing or weakened`).toContain(contains);
  }
});

test('the server does not announce what it is', async ({ request }) => {
  const headers = (await request.get('/')).headers();
  expect(headers['x-powered-by']).toBeUndefined();
});
