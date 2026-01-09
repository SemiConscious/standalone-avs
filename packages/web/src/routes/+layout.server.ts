/**
 * Root Layout Server
 * 
 * Provides platform and user information to all pages.
 * Platform is determined at the edge in hooks.server.ts.
 */

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  // Get user from platform-specific auth or legacy fields
  const user = locals.salesforce?.user ?? locals.user ?? null;

  return {
    user,
    platform: locals.platform,
    isDemo: locals.platform === 'demo',
  };
};
