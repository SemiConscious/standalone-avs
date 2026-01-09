/**
 * SvelteKit Server Hooks
 * 
 * This is the single source of truth for platform determination and authentication.
 * Platform is determined ONCE at the edge based on hostname/env and is immutable
 * for the entire request lifecycle.
 * 
 * Security guarantees:
 * 1. No cross-platform leakage - platform is set once and cannot change
 * 2. No fallback to demo - if Salesforce auth fails, redirect to login, NOT demo
 * 3. Centralized auth logic - all auth handling happens here
 */

import type { Handle } from '@sveltejs/kit';
import {
  determinePlatform,
  handlePlatformAuth,
  isProtectedRoute,
  getLoginUrl,
  type SalesforceAuth,
} from '$lib/platform';

export const handle: Handle = async ({ event, resolve }) => {
  // ==========================================================================
  // Step 1: Determine platform from hostname/env (ONCE)
  // This is immutable for the entire request lifecycle
  // ==========================================================================
  const platformConfig = determinePlatform(event.url.hostname);
  event.locals.platform = platformConfig.type;

  // ==========================================================================
  // Step 2: Handle platform-specific authentication
  // ==========================================================================
  const isProtected = isProtectedRoute(event.url.pathname);

  if (platformConfig.requiresAuth) {
    const auth = await handlePlatformAuth(event, platformConfig, isProtected);

    // Store platform-specific auth in locals
    if (platformConfig.type === 'salesforce' && auth) {
      const sfAuth = auth as SalesforceAuth;
      event.locals.salesforce = sfAuth;

      // Also populate legacy fields for backward compatibility
      // TODO: Remove these once all routes are migrated to new structure
      event.locals.accessToken = sfAuth.accessToken;
      event.locals.refreshToken = sfAuth.refreshToken;
      event.locals.instanceUrl = sfAuth.instanceUrl;
      event.locals.user = sfAuth.user;
    }

    // If protected route and not authenticated, redirect to login
    // IMPORTANT: Do NOT fall back to demo mode - redirect to login instead
    if (isProtected && !auth) {
      const loginUrl = getLoginUrl(platformConfig.type);
      return new Response(null, {
        status: 302,
        headers: {
          Location: loginUrl,
        },
      });
    }
  }

  // Demo mode doesn't require authentication
  // No auth data is set in locals for demo mode

  // ==========================================================================
  // Step 3: Resolve the request
  // ==========================================================================
  const response = await resolve(event);
  return response;
};
