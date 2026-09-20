import { z } from 'zod';

/**
 * The environment schema is authoritative: every variable the web app reads is
 * declared here and validated once, at build and at boot. A missing or
 * malformed value stops the process rather than producing a deployment that
 * half works — the same rule the API follows.
 */
const schema = z.object({
  /**
   * The API's origin — no path.
   *
   * The version prefix belongs to the published contract, not to configuration:
   * every path in the generated client already carries `/api/v1`, so putting it
   * here too would produce `/api/v1/api/v1/...`. The refine enforces that — a
   * value with a path fails the build instead of shipping the doubled prefix,
   * which CI once did while the e2e URL globs quietly matched it.
   */
  NEXT_PUBLIC_API_URL: z.url().refine((value) => new URL(value).pathname === '/', {
    message: 'NEXT_PUBLIC_API_URL must be an origin with no path (the /api/v1 prefix is built in).',
  }),
  /**
   * The app's own public origin. Canonical URLs, the sitemap and Open Graph
   * tags are absolute, so a wrong value here is an SEO incident rather than a
   * visible bug — which is why it is required instead of inferred.
   */
  NEXT_PUBLIC_SITE_URL: z.url(),
  /**
   * The local mail catcher's web inbox, when there is one.
   *
   * Development sends every message to a container on the machine rather than
   * to a real address, which is the only sane default — otherwise every test
   * sign-up mails a real person. The cost is that "check your email" is
   * misleading advice locally, so the screens that say it link here instead.
   * Unset in production, where the sentence is simply true.
   */
  NEXT_PUBLIC_DEV_MAILBOX_URL: z.url().optional(),
  /**
   * The Google reCAPTCHA v3 site key, when bot protection is enabled.
   *
   * Optional so local development and CI run without it: the sign-up form loads
   * the reCAPTCHA script and attaches a token only when this is set, and the API
   * verifies a token only when its matching secret is set. Set both together, in
   * production, to turn the protection on.
   */
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: z.string().min(1).optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

// Each variable is referenced by its full literal name. `process.env` cannot be
// destructured or spread here: the bundler inlines these values into the client
// bundle by textual substitution, and a dynamic lookup inlines nothing.
const parsed = schema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_DEV_MAILBOX_URL: process.env.NEXT_PUBLIC_DEV_MAILBOX_URL,
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
  NODE_ENV: process.env.NODE_ENV,
});

if (!parsed.success) {
  const problems = parsed.error.issues
    .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(
    `Invalid environment.\n${problems}\n\nCopy apps/web/.env.example to apps/web/.env.local and fill it in.`,
  );
}

export const env = parsed.data;
export type Env = typeof env;
