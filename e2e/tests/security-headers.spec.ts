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

test('script-src is nonce-based, not unsafe-inline', async ({ request }) => {
  const csp = (await request.get('/')).headers()['content-security-policy'] ?? '';
  const scriptSrc = csp
    .split(';')
    .map((directive) => directive.trim())
    .find((directive) => directive.startsWith('script-src'));

  // A fresh nonce every request, and strict-dynamic so a nonced script's own
  // imports inherit the trust — which is what lets script-src drop the inline
  // allowance a static policy had to keep. [F-13, §6.10]
  expect(scriptSrc, 'script-src directive is missing').toBeTruthy();
  expect(scriptSrc).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
  expect(scriptSrc).toContain("'strict-dynamic'");
  expect(scriptSrc).not.toContain("'unsafe-inline'");
});

test('the nonce differs from one request to the next', async ({ request }) => {
  const nonceOf = async (): Promise<string> => {
    const csp = (await request.get('/')).headers()['content-security-policy'] ?? '';
    return /'nonce-([A-Za-z0-9+/=]+)'/.exec(csp)?.[1] ?? '';
  };
  const [first, second] = await Promise.all([nonceOf(), nonceOf()]);
  expect(first).not.toEqual('');
  expect(first).not.toEqual(second);
});

test('the page runs its scripts under the policy and hydrates', async ({ page }) => {
  // If the nonce were not stamped onto Next's own script tags, strict-dynamic
  // would block them and the app would never hydrate. Interacting with a
  // client control proves the scripts ran under the policy.
  const violations: string[] = [];
  page.on('console', (message) => {
    if (message.text().includes('Content Security Policy')) violations.push(message.text());
  });
  await page.goto('/sign-in');
  await page.getByLabel(/password/i).fill('hydration-probe');
  await expect(page.getByLabel(/password/i)).toHaveValue('hydration-probe');
  expect(violations, violations.join('\n')).toEqual([]);
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
