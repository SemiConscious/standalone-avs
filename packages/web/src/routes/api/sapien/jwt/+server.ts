import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSapienJwt, getSapienOrganizationId, getSapienUserId, canGetSapienJwt } from '$lib/server/sapien';

export const GET: RequestHandler = async ({ locals, url }) => {
  // Check if user is authenticated with Salesforce
  if (!canGetSapienJwt(locals)) {
    return json({
      error: 'Not authenticated with Salesforce. Please log in first.',
    }, { status: 401 });
  }

  const scope = url.searchParams.get('scope') || 'flightdeck:basic';

  try {
    // Get JWT from Salesforce Apex REST endpoint
    const jwtResponse = await getSapienJwt(
      locals.instanceUrl!,
      locals.accessToken!,
      scope
    );

    // Parse the JWT response (it's JSON containing the JWT)
    let jwt: string;
    try {
      const parsed = JSON.parse(jwtResponse);
      jwt = parsed.jwt || jwtResponse;
    } catch {
      jwt = jwtResponse;
    }

    // Get organization ID and user ID from cached JWT
    const organizationId = getSapienOrganizationId();
    const userId = getSapienUserId();

    return json({
      jwt,
      scope,
      organizationId,
      userId,
      message: 'JWT retrieved successfully',
    });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error('Failed to get Sapien JWT:', errorMessage);
    
    return json({
      error: errorMessage,
      scope,
    }, { status: 500 });
  }
};

