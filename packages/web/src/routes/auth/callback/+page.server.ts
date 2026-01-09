/**
 * Platform-Aware OAuth Callback
 * 
 * Handles OAuth callbacks for all platforms.
 * Platform is stored in cookies during login initiation.
 */

import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { 
  getPlatformConfig, 
  getOAuthCredentials,
  storeSalesforceAuth,
  type SalesforceAuth,
  type PlatformType,
} from '$lib/platform';

export const load: PageServerLoad = async ({ url, cookies }) => {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const errorParam = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  // Check for OAuth errors
  if (errorParam) {
    error(400, `OAuth error: ${errorDescription ?? errorParam}`);
  }

  // Validate required parameters
  if (!code) {
    error(400, 'Missing authorization code');
  }

  // Validate state to prevent CSRF
  const storedState = cookies.get('oauth_state');
  if (!state || state !== storedState) {
    error(400, 'Invalid state parameter');
  }

  // Get PKCE code verifier
  const codeVerifier = cookies.get('oauth_code_verifier');
  if (!codeVerifier) {
    error(400, 'Missing PKCE code verifier');
  }

  // Get stored redirect URI and platform
  const storedRedirectUri = cookies.get('oauth_redirect_uri');
  const storedPlatform = cookies.get('oauth_platform') as PlatformType | undefined;

  // Clear OAuth cookies
  cookies.delete('oauth_state', { path: '/' });
  cookies.delete('oauth_code_verifier', { path: '/' });
  cookies.delete('oauth_redirect_uri', { path: '/' });
  cookies.delete('oauth_platform', { path: '/' });

  // Determine platform (from stored cookie or default to salesforce for legacy support)
  const platformType = storedPlatform || 'salesforce';
  const config = getPlatformConfig(platformType);

  // Get OAuth credentials
  const credentials = getOAuthCredentials(config);
  if (!credentials) {
    console.error(`[Callback] OAuth not configured for ${config.name}`);
    error(500, `${config.name} OAuth is not configured properly`);
  }

  // Build redirect URI
  const defaultRedirectUri = `${url.origin}/auth/callback`;
  const redirectUri = storedRedirectUri || defaultRedirectUri;

  const isProduction = process.env.NODE_ENV === 'production';

  try {
    switch (platformType) {
      case 'salesforce': {
        const auth = await handleSalesforceCallback({
          code,
          codeVerifier,
          redirectUri,
          credentials,
        });

        storeSalesforceAuth(cookies, auth, isProduction);
        break;
      }

      case 'dynamics': {
        // Future: Handle Dynamics callback
        error(501, 'Dynamics 365 authentication is not yet implemented');
      }

      default:
        error(400, `Platform ${platformType} does not support OAuth callback`);
    }
  } catch (err) {
    console.error('[Callback] OAuth error:', err);
    if (err instanceof Error && err.message.includes('OAuth')) {
      throw err;
    }
    error(500, 'Authentication failed');
  }

  // Redirect to home page on success
  redirect(302, '/');
};

/**
 * Handle Salesforce OAuth callback
 */
async function handleSalesforceCallback(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  credentials: {
    clientId: string;
    clientSecret: string | undefined;
    loginUrl: string;
    scopes: string[];
  };
}): Promise<SalesforceAuth> {
  const { code, codeVerifier, redirectUri, credentials } = params;

  // Build token request body with PKCE code verifier
  const tokenBody: Record<string, string> = {
    grant_type: 'authorization_code',
    code,
    client_id: credentials.clientId,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  };

  // Include client secret if provided (required for confidential clients)
  if (credentials.clientSecret) {
    tokenBody.client_secret = credentials.clientSecret;
  }

  // Exchange code for tokens
  const tokenResponse = await fetch(`${credentials.loginUrl}/services/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(tokenBody),
  });

  if (!tokenResponse.ok) {
    const errorData = await tokenResponse.text();
    console.error('[Salesforce Callback] Token exchange failed:', errorData);
    throw new Error(`Failed to exchange authorization code: ${errorData}`);
  }

  const tokens = await tokenResponse.json() as {
    access_token: string;
    refresh_token?: string;
    instance_url: string;
    id: string;
  };

  // Fetch user info
  const userInfoResponse = await fetch(tokens.id, {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
    },
  });

  if (!userInfoResponse.ok) {
    throw new Error('Failed to fetch user info');
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
}
