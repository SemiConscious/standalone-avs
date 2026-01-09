/**
 * Platform-Aware Logout
 * 
 * Clears authentication for the current platform and redirects appropriately.
 */

import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { clearSalesforceAuth, getLoginUrl, getPlatformConfig } from '$lib/platform';

/**
 * Handle logout - clear platform-specific auth and redirect
 */
function handleLogout(cookies: import('@sveltejs/kit').Cookies, platform: App.Locals['platform']): never {
  const config = getPlatformConfig(platform);

  // Clear platform-specific auth
  switch (platform) {
    case 'salesforce':
      clearSalesforceAuth(cookies);
      break;

    case 'dynamics':
      // Future: Clear Dynamics auth cookies
      cookies.delete('dynamics_access_token', { path: '/' });
      cookies.delete('dynamics_refresh_token', { path: '/' });
      cookies.delete('dynamics_user_info', { path: '/' });
      break;

    case 'demo':
      // Demo mode has no auth to clear
      break;
  }

  // Redirect to appropriate location
  if (config.requiresAuth) {
    const loginUrl = getLoginUrl(platform);
    redirect(302, loginUrl);
  } else {
    redirect(302, '/');
  }
}

// Handle GET requests - clear cookies and redirect
export const load: PageServerLoad = async ({ cookies, locals }) => {
  handleLogout(cookies, locals.platform);
};

// Handle POST requests (from form action)
export const actions: Actions = {
  default: async ({ cookies, locals }) => {
    handleLogout(cookies, locals.platform);
  },
};
