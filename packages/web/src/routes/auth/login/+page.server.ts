/**
 * Platform-Aware Login Page
 * 
 * Initiates OAuth flow for platforms that require authentication.
 * Platform is determined at the edge in hooks.server.ts.
 */

import { redirect, error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getPlatformConfig, getOAuthCredentials } from '$lib/platform';

/**
 * Generate a cryptographically random code verifier for PKCE
 */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Generate code challenge from verifier using SHA-256
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(hash));
}

/**
 * Base64 URL encode (RFC 4648)
 */
function base64UrlEncode(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export const load: PageServerLoad = async ({ locals }) => {
  const config = getPlatformConfig(locals.platform);
  
  // If platform doesn't require auth, redirect to home
  if (!config.requiresAuth) {
    redirect(302, '/');
  }
  
  // If already authenticated, redirect to home
  if (locals.platform === 'salesforce' && locals.salesforce) {
    redirect(302, '/');
  }
  
  return {
    platform: locals.platform,
    platformName: config.name,
  };
};

export const actions: Actions = {
  default: async ({ locals, cookies, url }) => {
    const config = getPlatformConfig(locals.platform);
    
    // If platform doesn't require auth, redirect to home
    if (!config.requiresAuth) {
      redirect(302, '/');
    }
    
    // Get OAuth credentials for the platform
    const credentials = getOAuthCredentials(config);
    if (!credentials) {
      console.error(`[Login] OAuth not configured for ${config.name}`);
      error(500, `${config.name} OAuth is not configured. Please contact your administrator.`);
    }

    // Generate state for CSRF protection
    const state = crypto.randomUUID();

    // Generate PKCE code verifier and challenge
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Build redirect URI from current request URL
    const redirectUri = `${url.origin}/auth/callback`;

    // Store state and code verifier in cookies
    const cookieOptions = {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 60 * 10, // 10 minutes
    };

    cookies.set('oauth_state', state, cookieOptions);
    cookies.set('oauth_code_verifier', codeVerifier, cookieOptions);
    cookies.set('oauth_redirect_uri', redirectUri, cookieOptions);
    cookies.set('oauth_platform', locals.platform, cookieOptions);

    // Build platform-specific OAuth authorization URL
    let authUrl: URL;

    switch (locals.platform) {
      case 'salesforce': {
        authUrl = new URL(`${credentials.loginUrl}/services/oauth2/authorize`);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('client_id', credentials.clientId);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('scope', credentials.scopes.join(' '));
        authUrl.searchParams.set('state', state);
        authUrl.searchParams.set('code_challenge', codeChallenge);
        authUrl.searchParams.set('code_challenge_method', 'S256');
        break;
      }

      case 'dynamics': {
        // Future: Implement Dynamics OAuth
        error(501, 'Dynamics 365 authentication is not yet implemented');
      }

      default:
        error(400, `Platform ${locals.platform} does not support OAuth login`);
    }

    redirect(302, authUrl.toString());
  },
};
