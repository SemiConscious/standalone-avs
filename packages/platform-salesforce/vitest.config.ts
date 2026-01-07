import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    include: ['src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        global: {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95,
        },
      },
      exclude: ['**/__mocks__/**', '**/types/**'],
    },
  },
  resolve: {
    alias: {
      '@avs/core': resolve(__dirname, '../core/src'),
    },
  },
});
