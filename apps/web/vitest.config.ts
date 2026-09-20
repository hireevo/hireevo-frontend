import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    // The environment schema is validated at import time and throws when a
    // variable is missing. Vitest does not read `.env.local`, so anything that
    // reaches `src/env.ts` — which now includes the API client — would fail to
    // import rather than fail a test. These are the shapes, not real values.
    env: {
      NEXT_PUBLIC_API_URL: 'http://localhost:3000',
      NEXT_PUBLIC_SITE_URL: 'http://localhost:3100',
    },
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // The primitives are tested in `packages/ui-web` and the routes end to end
    // by Playwright; what lives here is the app's own logic — schemas, form
    // state and the screens assembled from the primitives. `passWithNoTests` is
    // off so deleting the last test in this app fails rather than passes empty.
    passWithNoTests: false,
    coverage: {
      provider: 'v8',
      // A ratchet, not a target: set just below where the suite sits today so
      // coverage cannot silently fall, and raise it as more of the app's logic
      // is covered. README promised thresholds; there were none.
      thresholds: { statements: 60, branches: 45, functions: 70, lines: 65 },
    },
  },
});
