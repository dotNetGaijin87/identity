/* eslint-env node */
module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier',
  ],
  settings: {
    react: { version: 'detect' },
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    // Architecture rule: ban deep imports into a feature's internals — force the public index.ts.
    'no-restricted-imports': ['error', { patterns: ['@/features/*/*'] }],
    'import/no-cycle': 'error',
    'import/no-unresolved': 'off', // resolved by tsc/vite via the @/* alias
  },
  overrides: [
    {
      // Shared code must never reach into features.
      files: ['src/components/**', 'src/lib/**', 'src/hooks/**', 'src/utils/**', 'src/stores/**'],
      rules: {
        'no-restricted-imports': ['error', { patterns: ['@/features/*'] }],
      },
    },
    {
      files: ['**/*.test.ts', '**/*.test.tsx', 'src/testing/**', 'e2e/**'],
      rules: {
        'no-restricted-imports': 'off',
      },
    },
  ],
  ignorePatterns: [
    'dist',
    'node_modules',
    'public/mockServiceWorker.js',
    'playwright-report',
    '*.config.ts',
    '*.config.js',
  ],
};
