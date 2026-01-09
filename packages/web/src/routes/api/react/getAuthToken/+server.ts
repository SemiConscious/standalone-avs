import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getJwt } from '$lib/server/gatekeeper';

/**
 * Replicate ReactController.getAuthToken(scope)
 * POST /api/react/getAuthToken
 * Body: { scope: "routing-policies:admin" }
 * 
 * Returns: JSON string {"jwt":"eyJhbG..."} - the raw Gatekeeper response
 * 
 * This uses the new gatekeeper.ts module which:
 * 1. Fetches API settings from Salesforce (ApexRestProtectedSettings)
 * 2. Authenticates with Sapien using OAuth password grant
 * 3. Calls Gatekeeper to get the JWT
 */
export const POST: RequestHandler = async ({ locals, request }) => {
  if (!locals.accessToken || !locals.instanceUrl) {
    return json({ error: 'Not authenticated' }, { status: 401 });
  }

  const salesforceUserId = locals.user?.id;
  if (!salesforceUserId) {
    return json({ error: 'Salesforce user ID not available' }, { status: 401 });
  }

  try {
    const body = await request.json();
    let { scope } = body;

    if (!scope || typeof scope !== 'string') {
      return json({ error: 'Missing or invalid scope parameter' }, { status: 400 });
    }

    // URL decode the scope if it's encoded
    scope = decodeURIComponent(scope);

    // Get JWT using the new gatekeeper module
    const jwt = await getJwt(
      locals.instanceUrl,
      locals.accessToken,
      scope,
      salesforceUserId
    );

    // Return in the expected format: {"jwt":"eyJabc..."}
    return new Response(JSON.stringify({ jwt }), {
      headers: { 'Content-Type': 'text/plain' }
    });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error('getAuthToken error:', errorMessage);
    return json({ error: errorMessage }, { status: 500 });
  }
};
