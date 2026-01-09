import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { canUseSapienApi, getJwt, getOrganizationId } from '$lib/server/gatekeeper';

/**
 * Get a Gatekeeper JWT for a specific scope.
 * 
 * GET /api/sapien/jwt?scope=flightdeck:basic
 * 
 * Note: This returns a SCOPED JWT from Gatekeeper. The user must have
 * the requested scope assigned in Sapien for this to work.
 * 
 * For general Sapien API access (call logs, recordings, etc.),
 * use /api/sapien/token instead which returns a Sapien access token.
 */
export const GET: RequestHandler = async ({ locals, url }) => {
  if (!canUseSapienApi(locals)) {
    return json({
      error: 'Not authenticated with Salesforce. Please log in first.',
    }, { status: 401 });
  }

  const scope = url.searchParams.get('scope') || 'flightdeck:basic';

  try {
    // Get JWT from Gatekeeper with the specified scope
    const jwt = await getJwt(
      locals.instanceUrl!,
      locals.accessToken!,
      scope,
      locals.user?.id
    );

    const organizationId = getOrganizationId();

    return json({
      jwt,
      scope,
      organizationId,
      message: 'JWT retrieved successfully. Note: The JWT scope will be empty if the user does not have this scope assigned in Sapien.',
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
