import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/core/vitest.config.ts',
  'packages/platform-salesforce/vitest.config.ts',
  'packages/web/vitest.config.ts',
]);

