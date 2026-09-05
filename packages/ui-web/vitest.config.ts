import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/index.ts', 'src/test/**', 'src/**/*.test.{ts,tsx}'],
      // These primitives are the components every screen is built from, so the
      // bar is high on purpose. Raise it rather than lower it as more land.
      thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 },
    },
  },
});
