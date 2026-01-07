import { redirect, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { Actions } from './$types';

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

export const actions: Actions = {
  default: async ({ cookies, url }) => {
    // Validate required environment variables
    const clientId = env.SF_CLIENT_ID;
    // Build redirect URI from current request URL for dev mode flexibility
    const defaultRedirectUri = `${url.origin}/auth/callback`;
    const redirectUri = env.SF_REDIRECT_URI || defaultRedirectUri;
    const loginUrl = env.SF_LOGIN_URL || 'https://login.salesforce.com';

    if (!clientId) {
      console.error('SF_CLIENT_ID environment variable is not set');
      error(500, 'Salesforce OAuth is not configured. Please set SF_CLIENT_ID environment variable.');
    }

    // Generate state for CSRF protection
    const state = crypto.randomUUID();
    
    // Generate PKCE code verifier and challenge
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

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

    // Build Salesforce OAuth authorization URL with PKCE
    const authUrl = new URL(`${loginUrl}/services/oauth2/authorize`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', 'api refresh_token');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    redirect(302, authUrl.toString());
  },
};
