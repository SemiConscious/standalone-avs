/**
 * Vitest Browser Mode Configuration
 * 
 * This configuration runs Svelte component tests in a real browser,
 * which avoids CSS preprocessing issues that occur with jsdom.
 * 
 * Run with: pnpm test:browser
 */

import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['src/**/*.browser.{test,spec}.{js,ts}'],
    browser: {
      enabled: true,
      name: 'chromium',
      provider: 'playwright',
      headless: true,
    },
    setupFiles: ['./src/test-setup.ts'],
  },
});

