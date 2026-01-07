import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSapienJwt, canGetSapienJwt } from '$lib/server/sapien';

/**
 * Replicate ReactController.getAuthToken(scope)
 * POST /api/react/getAuthToken
 * Body: { scope: "routing-policies:admin" }
 * 
 * Returns: JSON string {"jwt":"eyJhbG..."} - the raw Gatekeeper response
 * This matches what AuthGatekeeper.getAuthToken returns (httpRes.getBody())
 */
export const POST: RequestHandler = async ({ locals, request }) => {
  if (!canGetSapienJwt(locals)) {
    return json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    let { scope } = body;

    if (!scope || typeof scope !== 'string') {
      return json({ error: 'Missing or invalid scope parameter' }, { status: 400 });
    }

    // URL decode the scope if it's encoded
    scope = decodeURIComponent(scope);

    const jwtResponse = await getSapienJwt(
      locals.instanceUrl!,
      locals.accessToken!,
      scope
    );

    // Return the raw Gatekeeper response as-is: {"jwt":"eyJabc..."}
    // The React app will JSON.parse this to extract the jwt field
    // If jwtResponse is already JSON with jwt field, return it directly
    // If it's just the JWT string, wrap it
    let responseBody: string;
    try {
      const parsed = JSON.parse(jwtResponse);
      if (parsed.jwt) {
        // Already in correct format
        responseBody = jwtResponse;
      } else {
        // Wrap it
        responseBody = JSON.stringify({ jwt: jwtResponse });
      }
    } catch {
      // jwtResponse is not JSON, so it's the raw JWT - wrap it
      responseBody = JSON.stringify({ jwt: jwtResponse });
    }

    return new Response(responseBody, {
      headers: { 'Content-Type': 'text/plain' }
    });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error('getAuthToken error:', errorMessage);
    return json({ error: errorMessage }, { status: 500 });
  }
};

