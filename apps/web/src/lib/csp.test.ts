import { afterEach, describe, expect, it, vi } from 'vitest';

// The env module is read at import time (apiOrigin) and per call (the reCAPTCHA
// site key), so it is mocked with a mutable object the tests flip.
const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    NEXT_PUBLIC_API_URL: 'https://api.example.com/',
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY: undefined as string | undefined,
    NEXT_PUBLIC_STORAGE_ORIGINS: undefined as string | undefined,
  },
}));
vi.mock('../env', () => ({ env: mockEnv }));

const { buildContentSecurityPolicy } = await import('./csp');

/** The one directive under test, pulled out of the joined policy string. */
function directive(csp: string, name: string): string {
  return (
    csp
      .split(';')
      .map((part) => part.trim())
      .find((part) => part === name || part.startsWith(`${name} `)) ?? ''
  );
}

afterEach(() => {
  mockEnv.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = undefined;
  mockEnv.NEXT_PUBLIC_STORAGE_ORIGINS = undefined;
  vi.unstubAllEnvs();
});

describe('buildContentSecurityPolicy', () => {
  it('is nonce-based and never allows inline scripts', () => {
    const csp = buildContentSecurityPolicy('abc123');
    const scriptSrc = directive(csp, 'script-src');

    expect(scriptSrc).toContain("'nonce-abc123'");
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  it('drops the development loosening in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const csp = buildContentSecurityPolicy('n');

    expect(csp).not.toContain('unsafe-eval');
    expect(csp).not.toMatch(/\bwss?:/);
    expect(csp).toContain('upgrade-insecure-requests');
  });

  it('grants nothing to google when reCAPTCHA is off', () => {
    const csp = buildContentSecurityPolicy('n');

    expect(csp).not.toContain('google.com');
    expect(csp).not.toContain('gstatic.com');
    // `frame-src` is still there — it is what lets a profile show the documents
    // attached to it — but with nothing of google's in it.
    expect(directive(csp, 'frame-src')).toBe("frame-src 'self'");
  });

  it('lets stored documents be framed, from the same origins images come from', () => {
    mockEnv.NEXT_PUBLIC_STORAGE_ORIGINS = 'http://localhost:9000,https://media.example.com';
    const csp = buildContentSecurityPolicy('n');

    // A certificate is shown in a frame on the page that carries it, so the
    // bucket has to be nameable in both directives or the frame is blank with
    // no error anyone sees.
    expect(directive(csp, 'frame-src')).toBe(
      "frame-src 'self' http://localhost:9000 https://media.example.com",
    );
    expect(directive(csp, 'img-src')).toContain('https://media.example.com');
  });

  it('opens exactly what reCAPTCHA needs when a site key is set', () => {
    mockEnv.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = 'a-site-key';
    const csp = buildContentSecurityPolicy('n');

    // The widget's iframe and its own requests are not covered by
    // 'strict-dynamic', so they need explicit host entries.
    expect(directive(csp, 'frame-src')).toBe("frame-src 'self' https://www.google.com");
    expect(directive(csp, 'connect-src')).toContain('https://www.google.com');
    // Fallback for engines that ignore 'strict-dynamic'.
    expect(directive(csp, 'script-src')).toContain('https://www.google.com');
    expect(directive(csp, 'script-src')).toContain('https://www.gstatic.com');
  });
});
