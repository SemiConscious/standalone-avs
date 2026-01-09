/**
 * Platform Module
 * 
 * Centralized platform detection and authentication handling.
 * 
 * @example
 * ```typescript
 * import { determinePlatform, handlePlatformAuth } from '$lib/platform';
 * 
 * // In hooks.server.ts
 * const platform = determinePlatform(event.url.hostname);
 * event.locals.platform = platform.type;
 * 
 * if (platform.requiresAuth) {
 *   const auth = await handlePlatformAuth(event, platform, isProtectedRoute);
 *   if (platform.type === 'salesforce') {
 *     event.locals.salesforce = auth;
 *   }
 * }
 * ```
 */

// Re-export configuration
export {
  type PlatformType,
  type PlatformConfig,
  type OAuthConfig,
  DEMO_CONFIG,
  SALESFORCE_CONFIG,
  DYNAMICS_CONFIG,
  PLATFORM_CONFIGS,
  determinePlatform,
  getPlatformConfig,
  getPlatformFromEnv,
  getPlatformFromHostname,
  getOAuthCredentials,
} from './config';

// Re-export authentication
export {
  type SalesforceAuth,
  type DynamicsAuth,
  type PlatformAuth,
  handlePlatformAuth,
  getSalesforceAuthFromCookies,
  validateSalesforceToken,
  refreshSalesforceToken,
  storeSalesforceAuth,
  clearSalesforceAuth,
  getDynamicsAuthFromCookies,
  validateDynamicsToken,
  getLoginUrl,
} from './auth';

// =============================================================================
// Protected Routes Configuration
// =============================================================================

/**
 * Routes that require authentication
 * These routes will redirect to login if user is not authenticated
 */
export const PROTECTED_ROUTES = [
  '/users',
  '/groups',
  '/devices',
  '/phone-numbers',
  '/call-flows',
  '/settings',
  '/insights',
  '/dial-lists',
  '/admin',
  '/routing-policies',
  '/call-logs',
  '/sounds',
  '/wallboards',
  '/messaging',
  '/skills',
  '/general-settings',
  '/account-settings',
  '/call-status',
  '/call-reporting',
  '/policy-editor',
  '/my-profile',
];

/**
 * Check if a path requires authentication
 */
export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Routes that are always public (even on authenticated platforms)
 */
export const PUBLIC_ROUTES = [
  '/',
  '/auth',
  '/api/health',
];

/**
 * Check if a path is public
 */
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => 
    pathname === route || pathname.startsWith(route + '/')
  );
}
