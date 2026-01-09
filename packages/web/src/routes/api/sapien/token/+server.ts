import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { 
  getSapienAccessToken, 
  getOrganizationId,
  getSapienHost,
  canUseSapienApi 
} from '$lib/server/gatekeeper';

/**
 * Get a Sapien access token for general API access.
 * 
 * GET /api/sapien/token
 * 
 * This uses the same authentication method as avs-sfdx RestClient:
 * - OAuth password grant with API service account credentials
 * - Returns an access token that works for general Sapien API calls
 * 
 * Note: This is different from Gatekeeper JWTs which are scoped.
 * Use this for general API access (call logs, recordings, sounds, etc.)
 */
export const GET: RequestHandler = async ({ locals }) => {
  if (!canUseSapienApi(locals)) {
    return json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const token = await getSapienAccessToken(locals.instanceUrl!, locals.accessToken!);
    const organizationId = getOrganizationId();
    const sapienHost = getSapienHost();

    return json({
      accessToken: token,
      tokenType: 'bearer',
      organizationId,
      sapienHost,
      message: 'Sapien access token retrieved successfully',
    });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error('Failed to get Sapien access token:', errorMessage);
    
    return json({
      error: errorMessage,
    }, { status: 500 });
  }
};
