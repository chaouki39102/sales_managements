import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['public/build/**', 'vendor/**'] },
  {
    extends: [
      ...tseslint.configs.recommended,
    ],
    files: ['resources/js/**/*.{ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
    settings: {
      react: { version: 'detect' },
    },
  },
  // Pages-only: warn on raw useQuery / useMutation (should use tenant wrappers)
  {
    files: ['resources/js/pages/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['warn', {
        selector: 'CallExpression[callee.name="useQuery"]',
        message: 'Raw useQuery() in pages/. Use useTenantQuery() or a shared endpoint hook that enforces slug-scoped keys + enabled guard.',
      }, {
        selector: 'CallExpression[callee.name="useMutation"]',
        message: 'Raw useMutation() in pages/. Use useTenantMutation() or a shared endpoint hook that auto-invalidates.',
      }],
    },
  },
);
