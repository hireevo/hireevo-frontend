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

test('the production policy carries none of the development loosening', async ({ request }) => {
  const csp = (await request.get('/')).headers()['content-security-policy'] ?? '';
  // `unsafe-eval` and a bare websocket scheme are allowed while React's dev
  // build needs them. If either survives into a production build, the policy
  // has quietly stopped being the one that was reviewed.
  expect(csp).not.toContain('unsafe-eval');
  expect(csp).not.toMatch(/\bwss?:/);
});

test('the development mailbox note is not in the production build', async ({ page }) => {
  // Locally these screens point at the mail catcher, because that is where the
  // mail actually goes. In production the mail goes to the address on screen,
  // and a note saying otherwise would be both wrong and a small disclosure of
  // how the environment is wired.
  await page.goto('/confirm-email?email=someone%40example.com');
  await expect(page.getByText('Development only.')).toBeHidden();

  await page.goto('/recover');
  await expect(page.getByText('Development only.')).toBeHidden();
});

test('the server does not announce what it is', async ({ request }) => {
  const headers = (await request.get('/')).headers();
  expect(headers['x-powered-by']).toBeUndefined();
});
