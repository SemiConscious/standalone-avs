/**
 * API Endpoint: Sapien Connection Status
 * 
 * GET /api/sapien/status
 * 
 * Returns the Sapien API configuration status and connection test results.
 * 
 * The standalone app gets Sapien access by:
 * 1. Using the user's Salesforce access token to fetch API settings
 * 2. Authenticating with Sapien using OAuth password grant (same as avs-sfdx RestClient)
 * 3. Using the Sapien access token for general API calls
 * 4. Using Gatekeeper JWT for specific scoped operations
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { 
  canUseSapienApi, 
  getSapienAccessToken,
  getSapienHost,
  getOrganizationId,
  getSapienUserDetails,
  getJwt,
} from '$lib/server/gatekeeper';

export const GET: RequestHandler = async ({ locals }) => {
  const hasSalesforceSession = canUseSapienApi(locals);
  
  let sapienAccessTest: { success: boolean; error?: string; scope?: string } = { success: false };
  let jwtTest: { success: boolean; error?: string; scope?: string } = { success: false };
  let userDetails: { id?: number; username?: string; scopes?: string[] } = {};
  
  // Test getting Sapien access token (for general API access)
  if (hasSalesforceSession) {
    try {
      const token = await getSapienAccessToken(locals.instanceUrl!, locals.accessToken!);
      sapienAccessTest = { 
        success: !!token, 
        scope: 'user admin', // The scope returned from OAuth password grant
      };
      
      // Get user details including scopes
      const orgId = getOrganizationId();
      if (orgId) {
        // Try to get user details to see available scopes
        try {
          // We need a user ID - for now use a placeholder
          const details = await getSapienUserDetails(orgId, 119010); // TODO: Get actual user ID
          userDetails = {
            id: details.id,
            username: details.username,
            scopes: details.scopes,
          };
        } catch {
          // User details fetch failed, continue without
        }
      }
    } catch (error) {
      sapienAccessTest = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // Test getting a Gatekeeper JWT (for scoped operations)
    if (userDetails.scopes && userDetails.scopes.length > 0) {
      try {
        const testScope = userDetails.scopes[0];
        const jwt = await getJwt(
          locals.instanceUrl!,
          locals.accessToken!,
          testScope,
          locals.user?.id
        );
        jwtTest = { 
          success: !!jwt, 
          scope: testScope,
        };
      } catch (error) {
        jwtTest = { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  }

  // Get config values
  const sapienHost = getSapienHost();
  const orgId = getOrganizationId();

  return json({
    // Authentication method
    authMethod: 'sapien-oauth-password-grant',
    
    // Salesforce session status
    salesforceSession: {
      hasAccessToken: !!locals.accessToken,
      hasInstanceUrl: !!locals.instanceUrl,
      canUseSapienApi: hasSalesforceSession,
    },
    
    // Sapien access token test (for general API calls - same as avs-sfdx RestClient)
    sapienAccessTest,
    
    // Gatekeeper JWT test (for scoped operations)
    gatekeeperJwtTest: jwtTest,
    
    // User's assigned Sapien scopes
    userScopes: userDetails.scopes || [],
    
    // Sapien config
    sapienConfig: {
      host: sapienHost ? '***configured***' : undefined,
      organizationId: orgId,
    },
    
    // Available features based on current configuration
    features: {
      // General Sapien API access (call logs, recordings, sounds, etc.)
      sapienApiAccess: sapienAccessTest.success,
      
      // Scoped operations (wallboards, insights, etc.)
      scopedOperations: jwtTest.success,
      availableScopes: userDetails.scopes || [],
      
      // Salesforce data access
      salesforceDataAccess: hasSalesforceSession,
    },
    
    // How to enable features
    setup: {
      forBasicFeatures: 'Authenticate with Salesforce OAuth',
      forScopedFeatures: 'User must have scopes assigned in Sapien (e.g., flightdeck:admin, insights:admin)',
      authentication: 'Uses API credentials from Salesforce custom settings to authenticate with Sapien',
    },
  });
};
