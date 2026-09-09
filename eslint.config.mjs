import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import next from 'eslint-config-next/core-web-vitals';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/node_modules/**',
      // Regenerated from the pinned OpenAPI spec; findings belong upstream.
      'packages/api-client/generated/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  // Brings the React, react-hooks, jsx-a11y and @next/next rule sets in one
  // dependency. It is also why this repository pins ESLint 9 while the backend
  // is on 10: eslint-plugin-react 7.37.5 still calls `context.getFilename()`,
  // removed in ESLint 10, and crashes on the first JSX file. Raise the pin once
  // that plugin ships an ESLint 10 build.
  ...next,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    // Version detection walks up looking for an installed `react`, which the
    // non-React packages do not have; stating it removes the guess and its warning.
    settings: { react: { version: '19.2' } },
    rules: {
      // A pages-router rule. The App Router has no `pages/` directory, so it
      // only ever reports that it could not find one.
      '@next/next/no-html-link-for-pages': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // A leaked `any` is how a private profile field reaches the hydration payload.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      'no-console': 'error',
    },
  },
  {
    // Build scripts are plain Node programs: they print, and they are not part
    // of an app's tsconfig project.
    files: ['**/scripts/**/*.{mjs,ts}', '**/*.config.{mjs,mts,ts}'],
    extends: [tseslint.configs.disableTypeChecked],
    rules: { 'no-console': 'off' },
  },
  prettier,
);
