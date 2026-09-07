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
   * here too would produce `/api/v1/api/v1/...`.
   */
  NEXT_PUBLIC_API_URL: z.url(),
  /**
   * The app's own public origin. Canonical URLs, the sitemap and Open Graph
   * tags are absolute, so a wrong value here is an SEO incident rather than a
   * visible bug — which is why it is required instead of inferred.
   */
  NEXT_PUBLIC_SITE_URL: z.url(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

// Each variable is referenced by its full literal name. `process.env` cannot be
// destructured or spread here: the bundler inlines these values into the client
// bundle by textual substitution, and a dynamic lookup inlines nothing.
const parsed = schema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
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
