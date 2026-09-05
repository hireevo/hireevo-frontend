import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // Workspace packages ship TypeScript source rather than a build output, so a
  // token or primitive change hot-reloads instead of needing a rebuild first.
  transpilePackages: ['@hireevo/tokens', '@hireevo/ui-web'],
  typedRoutes: true,
  poweredByHeader: false,
};

export default config;
