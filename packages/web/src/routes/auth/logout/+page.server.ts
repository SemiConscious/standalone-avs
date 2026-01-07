import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

// Handle GET requests - clear cookies and redirect
export const load: PageServerLoad = async ({ cookies }) => {
  // Clear all auth-related cookies
  cookies.delete('sf_access_token', { path: '/' });
  cookies.delete('sf_refresh_token', { path: '/' });
  cookies.delete('sf_instance_url', { path: '/' });
  cookies.delete('user_info', { path: '/' });

  redirect(302, '/auth/login');
};

// Handle POST requests (from form action)
export const actions: Actions = {
  default: async ({ cookies }) => {
    // Clear all auth-related cookies
    cookies.delete('sf_access_token', { path: '/' });
    cookies.delete('sf_refresh_token', { path: '/' });
    cookies.delete('sf_instance_url', { path: '/' });
    cookies.delete('user_info', { path: '/' });

    redirect(302, '/auth/login');
  },
};

