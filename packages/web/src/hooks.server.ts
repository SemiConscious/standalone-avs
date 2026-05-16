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
import { env } from '$env/dynamic/private';
import {
  determinePlatform,
  handlePlatformAuth,
  isProtectedRoute,
  getLoginUrl,
  type SalesforceAuth,
} from '$lib/platform';
import { exchangeSalesforceAccessTokenForCharlieJwt } from '$lib/charlie';

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

      // ====================================================================
      // Step 2a: Exchange the SF access token for a Charlie session JWT.
      //
      // See charlie-api/docs/STANDALONE_AVS_INTEGRATION.md §4. In Phase 0
      // Charlie returns 501 (SalesforceIdentityProvider not yet
      // registered) — that's expected; we log it once per request and
      // continue. Pages that try to call Charlie GraphQL without
      // locals.charlieSession get a typed `null` and degrade gracefully.
      //
      // Future improvement: cache the issued JWT in an httpOnly cookie
      // keyed by SF access-token hash, so we only round-trip Charlie
      // once per SF session rather than once per request.
      // ====================================================================
      const tokenExchangeBase = env.CHARLIE_TOKEN_EXCHANGE_BASE ?? null;
      const charlieResult = await exchangeSalesforceAccessTokenForCharlieJwt(
        sfAuth.accessToken,
        tokenExchangeBase,
        event.fetch
      );
      if (charlieResult.ok) {
        event.locals.charlieSession = charlieResult.session;
      } else if (
        charlieResult.reason !== 'NOT_IMPLEMENTED' &&
        charlieResult.reason !== 'NOT_CONFIGURED'
      ) {
        console.warn(
          `[charlie] token exchange failed: ${charlieResult.reason} (${charlieResult.httpStatus}) ${charlieResult.message}`
        );
      }
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
