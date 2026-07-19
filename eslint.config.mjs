import tseslint from '@typescript-eslint/eslint-plugin';
import parser from '@typescript-eslint/parser';

export default [{ ignores: ['coverage/**', 'main.js', 'node_modules/**'] }, {
  files: ['src/**/*.ts', 'tests/**/*.ts'],
  languageOptions: { parser },
  plugins: { '@typescript-eslint': tseslint },
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
  }
}];
