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
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // The primitives are tested in `packages/ui-web` and the routes end to end
    // by Playwright; what lives here is the app's own logic — schemas, form
    // state and the screens assembled from the primitives.
    passWithNoTests: true,
  },
});
