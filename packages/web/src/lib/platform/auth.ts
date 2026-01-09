/**
 * Platform Authentication
 * 
 * Handles authentication for different platforms.
 * All auth logic is centralized here and called from hooks.server.ts
 */

import type { Cookies, RequestEvent } from '@sveltejs/kit';
import type { PlatformConfig, PlatformType } from './config';
import { getOAuthCredentials } from './config';

// =============================================================================
// Auth Types
// =============================================================================

/**
 * Salesforce authentication data
 */
export interface SalesforceAuth {
  accessToken: string;
  refreshToken?: string;
  instanceUrl: string;
  user: {
    id: string;
    email: string;
    name: string;
    organizationId: string;
  };
}

/**
 * Dynamics 365 authentication data (future)
 */
export interface DynamicsAuth {
  accessToken: string;
  refreshToken?: string;
  tenantId: string;
  organizationUrl: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

/**
 * Union type of all platform auth types
 */
export type PlatformAuth = SalesforceAuth | DynamicsAuth;

// =============================================================================
// Cookie Configuration
// =============================================================================

const COOKIE_OPTIONS = {
  path: '/',
  httpOnly: true,
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

function getCookieOptions(isProduction: boolean) {
  return {
    ...COOKIE_OPTIONS,
    secure: isProduction,
  };
}

// =============================================================================
// Salesforce Auth
// =============================================================================

/**
 * Get Salesforce auth from cookies
 */
export function getSalesforceAuthFromCookies(cookies: Cookies): SalesforceAuth | null {
  const accessToken = cookies.get('sf_access_token');
  const instanceUrl = cookies.get('sf_instance_url');
  const userInfoCookie = cookies.get('user_info');
  const refreshToken = cookies.get('sf_refresh_token');

  if (!accessToken || !instanceUrl) {
    return null;
  }

  let user: SalesforceAuth['user'] | null = null;
  if (userInfoCookie) {
    try {
      user = JSON.parse(userInfoCookie);
    } catch {
      return null;
    }
  }

  if (!user) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    instanceUrl,
    user,
  };
}

/**
 * Validate Salesforce access token by making a lightweight API call
 */
export async function validateSalesforceToken(auth: SalesforceAuth): Promise<boolean> {
  try {
    const response = await fetch(`${auth.instanceUrl}/services/data/v62.0/limits`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Refresh Salesforce access token
 */
export async function refreshSalesforceToken(
  refreshToken: string,
  config: PlatformConfig
): Promise<SalesforceAuth | null> {
  const credentials = getOAuthCredentials(config);
  if (!credentials) {
    console.error('[Salesforce Auth] OAuth not configured');
    return null;
  }

  try {
    const tokenBody: Record<string, string> = {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: credentials.clientId,
    };

    if (credentials.clientSecret) {
      tokenBody.client_secret = credentials.clientSecret;
    }

    const response = await fetch(`${credentials.loginUrl}/services/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(tokenBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Salesforce Auth] Token refresh failed:', response.status, errorText);
      return null;
    }

    const tokens = await response.json() as {
      access_token: string;
      refresh_token?: string;
      instance_url: string;
      id: string;
    };

    // Fetch user info with new token
    const userInfoResponse = await fetch(tokens.id, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      console.error('[Salesforce Auth] Failed to fetch user info after refresh');
      return null;
    }

    const userInfo = await userInfoResponse.json() as {
      user_id: string;
      email: string;
      name: string;
      organization_id: string;
    };

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      instanceUrl: tokens.instance_url,
      user: {
        id: userInfo.user_id,
        email: userInfo.email,
        name: userInfo.name,
        organizationId: userInfo.organization_id,
      },
    };
  } catch (err) {
    console.error('[Salesforce Auth] Refresh error:', err);
    return null;
  }
}

/**
 * Store Salesforce auth in cookies
 */
export function storeSalesforceAuth(cookies: Cookies, auth: SalesforceAuth, isProduction: boolean): void {
  const options = getCookieOptions(isProduction);

  cookies.set('sf_access_token', auth.accessToken, options);
  cookies.set('sf_instance_url', auth.instanceUrl, options);

  if (auth.refreshToken) {
    cookies.set('sf_refresh_token', auth.refreshToken, options);
  }

  // User info is not httpOnly so it can be read by client for display
  cookies.set('user_info', JSON.stringify(auth.user), {
    ...options,
    httpOnly: false,
  });
}

/**
 * Clear Salesforce auth cookies
 */
export function clearSalesforceAuth(cookies: Cookies): void {
  cookies.delete('sf_access_token', { path: '/' });
  cookies.delete('sf_refresh_token', { path: '/' });
  cookies.delete('sf_instance_url', { path: '/' });
  cookies.delete('user_info', { path: '/' });
}

// =============================================================================
// Dynamics Auth (Future)
// =============================================================================

/**
 * Get Dynamics auth from cookies
 */
export function getDynamicsAuthFromCookies(_cookies: Cookies): DynamicsAuth | null {
  // TODO: Implement when Dynamics support is added
  return null;
}

/**
 * Validate Dynamics access token
 */
export async function validateDynamicsToken(_auth: DynamicsAuth): Promise<boolean> {
  // TODO: Implement when Dynamics support is added
  return false;
}

// =============================================================================
// Platform Auth Handler
// =============================================================================

/**
 * Handle authentication for a platform
 * Returns the auth object if authenticated, null otherwise
 */
export async function handlePlatformAuth(
  event: RequestEvent,
  config: PlatformConfig,
  isProtectedRoute: boolean
): Promise<PlatformAuth | null> {
  if (!config.requiresAuth) {
    return null;
  }

  const isProduction = process.env.NODE_ENV === 'production';

  switch (config.type) {
    case 'salesforce': {
      let auth = getSalesforceAuthFromCookies(event.cookies);

      // If we have auth and this is a protected route, validate the token
      if (auth && isProtectedRoute) {
        const isValid = await validateSalesforceToken(auth);

        if (!isValid && auth.refreshToken) {
          // Try to refresh
          console.log('[Platform Auth] Salesforce token invalid, attempting refresh');
          const refreshedAuth = await refreshSalesforceToken(auth.refreshToken, config);

          if (refreshedAuth) {
            // Update cookies with new tokens
            storeSalesforceAuth(event.cookies, refreshedAuth, isProduction);
            auth = refreshedAuth;
            console.log('[Platform Auth] Salesforce token refreshed successfully');
          } else {
            // Refresh failed, clear auth
            clearSalesforceAuth(event.cookies);
            auth = null;
            console.log('[Platform Auth] Salesforce token refresh failed');
          }
        } else if (!isValid) {
          // No refresh token, clear auth
          clearSalesforceAuth(event.cookies);
          auth = null;
        }
      }

      return auth;
    }

    case 'dynamics': {
      // Future: Implement Dynamics auth handling
      const auth = getDynamicsAuthFromCookies(event.cookies);
      return auth;
    }

    default:
      return null;
  }
}

/**
 * Get the login URL for a platform
 */
export function getLoginUrl(platformType: PlatformType): string {
  switch (platformType) {
    case 'salesforce':
      return '/auth/login';
    case 'dynamics':
      return '/auth/dynamics/login';
    default:
      return '/';
  }
}
