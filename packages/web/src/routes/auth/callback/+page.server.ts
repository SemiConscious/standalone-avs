import { error, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

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

  // Clear OAuth cookies
  cookies.delete('oauth_state', { path: '/' });
  cookies.delete('oauth_code_verifier', { path: '/' });

  // Get environment variables
  const clientId = env.SF_CLIENT_ID;
  const clientSecret = env.SF_CLIENT_SECRET;
  const redirectUri = env.SF_REDIRECT_URI || 'http://localhost:5173/auth/callback';
  const loginUrl = env.SF_LOGIN_URL || 'https://login.salesforce.com';

  if (!clientId) {
    console.error('SF_CLIENT_ID environment variable is not set');
    error(500, 'Salesforce OAuth is not configured properly');
  }

  try {
    // Build token request body with PKCE code verifier
    const tokenBody: Record<string, string> = {
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    };

    // Include client secret if provided (required for confidential clients)
    if (clientSecret) {
      tokenBody.client_secret = clientSecret;
    }

    // Exchange code for tokens
    const tokenResponse = await fetch(`${loginUrl}/services/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(tokenBody),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      error(500, `Failed to exchange authorization code for tokens: ${errorData}`);
    }

    const tokens = (await tokenResponse.json()) as {
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
      error(500, 'Failed to fetch user info');
    }

    const userInfo = (await userInfoResponse.json()) as {
      user_id: string;
      email: string;
      name: string;
      organization_id: string;
    };

    // Store tokens in secure cookies
    const isProduction = process.env.NODE_ENV === 'production';
    const maxAge = 60 * 60 * 24 * 7; // 7 days

    cookies.set('sf_access_token', tokens.access_token, {
      path: '/',
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge,
    });

    if (tokens.refresh_token) {
      cookies.set('sf_refresh_token', tokens.refresh_token, {
        path: '/',
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge,
      });
    }

    cookies.set('sf_instance_url', tokens.instance_url, {
      path: '/',
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge,
    });

    // Store user info (less sensitive, accessible to client for display)
    cookies.set(
      'user_info',
      JSON.stringify({
        id: userInfo.user_id,
        email: userInfo.email,
        name: userInfo.name,
        organizationId: userInfo.organization_id,
      }),
      {
        path: '/',
        httpOnly: false,
        secure: isProduction,
        sameSite: 'lax',
        maxAge,
      }
    );
  } catch (err) {
    console.error('OAuth callback error:', err);
    error(500, 'Authentication failed');
  }

  // Redirect to home page on success
  redirect(302, '/');
};
