import tseslint from '@typescript-eslint/eslint-plugin';
import parser from '@typescript-eslint/parser';
import { defineConfig } from 'eslint/config';
import obsidianmd from 'eslint-plugin-obsidianmd';

export default defineConfig([
  { ignores: ['coverage/**', 'esbuild.config.mjs', 'main.js', 'node_modules/**'] },
  ...obsidianmd.configs.recommendedWithLocalesEn,
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      parser,
      parserOptions: { project: './tsconfig.eslint.json' }
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'obsidianmd/ui/sentence-case': ['warn', { brands: ['Mood Journal', 'Obsidian', 'GitHub'], acronyms: ['API', 'URL', 'HTML'] }]
    }
  },
  {
    files: ['src/ui/settings-tab.ts'],
    rules: {
      '@typescript-eslint/no-deprecated': 'off',
      'obsidianmd/settings-tab/prefer-setting-definitions': 'off'
    }
  },
  {
    files: ['src/services/clipboard-service.ts'],
    rules: {
      '@typescript-eslint/no-deprecated': 'off'
    }
  }
]);
