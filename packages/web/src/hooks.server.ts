import type { Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  instance_url: string;
  id: string;
  issued_at: string;
}

/**
 * Refreshes the Salesforce access token using the refresh token.
 * Returns the new tokens if successful, null otherwise.
 */
async function refreshAccessToken(refreshToken: string): Promise<TokenResponse | null> {
  const clientId = env.SF_CLIENT_ID;
  const clientSecret = env.SF_CLIENT_SECRET;
  const loginUrl = env.SF_LOGIN_URL || 'https://login.salesforce.com';

  if (!clientId) {
    console.error('[Token Refresh] SF_CLIENT_ID not configured');
    return null;
  }

  try {
    const tokenBody: Record<string, string> = {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
    };

    if (clientSecret) {
      tokenBody.client_secret = clientSecret;
    }

    console.log('[Token Refresh] Attempting to refresh access token');
    
    const response = await fetch(`${loginUrl}/services/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(tokenBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Token Refresh] Failed:', response.status, errorText);
      return null;
    }

    const tokens = await response.json() as TokenResponse;
    console.log('[Token Refresh] Success');
    return tokens;
  } catch (err) {
    console.error('[Token Refresh] Error:', err);
    return null;
  }
}

/**
 * Checks if the access token is valid by making a lightweight API call.
 * Returns true if valid, false otherwise.
 */
async function isTokenValid(accessToken: string, instanceUrl: string): Promise<boolean> {
  try {
    // Use the limits endpoint as a lightweight way to verify token validity
    const response = await fetch(`${instanceUrl}/services/data/v62.0/limits`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

export const handle: Handle = async ({ event, resolve }) => {
  // Get auth tokens from cookies
  let accessToken = event.cookies.get('sf_access_token');
  const refreshToken = event.cookies.get('sf_refresh_token');
  let instanceUrl = event.cookies.get('sf_instance_url');
  const userInfoCookie = event.cookies.get('user_info');

  const isProduction = process.env.NODE_ENV === 'production';
  const maxAge = 60 * 60 * 24 * 7; // 7 days

  // If we have an access token, verify it's still valid
  if (accessToken && instanceUrl && refreshToken) {
    const tokenValid = await isTokenValid(accessToken, instanceUrl);
    
    if (!tokenValid) {
      console.log('[Auth] Access token invalid or expired, attempting refresh');
      
      // Try to refresh the token
      const newTokens = await refreshAccessToken(refreshToken);
      
      if (newTokens) {
        // Update cookies with new tokens
        accessToken = newTokens.access_token;
        instanceUrl = newTokens.instance_url;

        event.cookies.set('sf_access_token', newTokens.access_token, {
          path: '/',
          httpOnly: true,
          secure: isProduction,
          sameSite: 'lax',
          maxAge,
        });

        if (newTokens.refresh_token) {
          event.cookies.set('sf_refresh_token', newTokens.refresh_token, {
            path: '/',
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge,
          });
        }

        event.cookies.set('sf_instance_url', newTokens.instance_url, {
          path: '/',
          httpOnly: true,
          secure: isProduction,
          sameSite: 'lax',
          maxAge,
        });

        console.log('[Auth] Token refreshed successfully');
      } else {
        // Refresh failed - clear all auth cookies
        console.log('[Auth] Token refresh failed, clearing auth state');
        event.cookies.delete('sf_access_token', { path: '/' });
        event.cookies.delete('sf_refresh_token', { path: '/' });
        event.cookies.delete('sf_instance_url', { path: '/' });
        event.cookies.delete('user_info', { path: '/' });
        accessToken = undefined;
      }
    }
  }

  // Set auth data in locals
  if (accessToken) {
    event.locals.accessToken = accessToken;
    event.locals.refreshToken = refreshToken;
    event.locals.instanceUrl = instanceUrl;

    // Parse user info if available
    if (userInfoCookie) {
      try {
        event.locals.user = JSON.parse(userInfoCookie) as {
          id: string;
          email: string;
          name: string;
          organizationId: string;
        };
      } catch {
        // Invalid user info cookie, clear it
        event.cookies.delete('user_info', { path: '/' });
      }
    }
  }

  // Check for protected routes
  const protectedPaths = ['/users', '/groups', '/devices', '/phone-numbers', '/call-flows', '/settings', '/insights', '/dial-lists'];
  const isProtectedRoute = protectedPaths.some((path) => event.url.pathname.startsWith(path));

  if (isProtectedRoute && !event.locals.user) {
    // Redirect to login for protected routes
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/auth/login',
      },
    });
  }

  const response = await resolve(event);
  return response;
};

