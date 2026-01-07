/**
 * API Endpoint: Sapien Connection Status
 * 
 * GET /api/sapien/status
 * 
 * Returns the Sapien API configuration status and connection test results.
 * 
 * The standalone app gets Sapien access by:
 * 1. Using the user's Salesforce access token
 * 2. Calling the Apex REST endpoint /services/apexrest/token/{scope}
 * 3. Receiving a Sapien JWT that can be used for API calls
 * 
 * This leverages the existing Salesforce infrastructure and doesn't
 * require separate Sapien credentials.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { 
  canGetSapienJwt, 
  getSapienJwt,
  getSapienConfig,
  isSapienDirectConfigured,
  getCachedJwtPayload,
  getSapienOrganizationId,
  getSapienUserId,
  getSapienUsername,
  SAPIEN_SCOPES,
} from '$lib/server/sapien';

export const GET: RequestHandler = async ({ locals }) => {
  const hasSalesforceSession = canGetSapienJwt(locals);
  
  let jwtTest: { success: boolean; error?: string; scope?: string } = { success: false };
  let jwtPayload: Record<string, unknown> | null = null;
  
  // Test getting a Sapien JWT via the Salesforce Apex REST endpoint
  if (hasSalesforceSession) {
    try {
      const jwt = await getSapienJwt(
        locals.instanceUrl!,
        locals.accessToken!,
        SAPIEN_SCOPES.ENDUSER_BASIC
      );
      jwtTest = { 
        success: !!jwt, 
        scope: SAPIEN_SCOPES.ENDUSER_BASIC,
      };
      
      // Get the decoded payload
      const payload = getCachedJwtPayload();
      if (payload) {
        // Show full payload to see what fields are available
        jwtPayload = {
          ...payload,
          // Add human-readable expiration
          expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : undefined,
        };
      }
    } catch (error) {
      jwtTest = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Get extracted values from JWT
  const orgId = getSapienOrganizationId();
  const userId = getSapienUserId();
  const username = getSapienUsername();

  // Get config AFTER JWT retrieval (so org ID from JWT is available)
  const config = getSapienConfig();
  const hasDirectConfig = isSapienDirectConfigured();

  return json({
    // Authentication method
    authMethod: 'salesforce-apex-rest',
    
    // Salesforce session status
    salesforceSession: {
      hasAccessToken: !!locals.accessToken,
      hasInstanceUrl: !!locals.instanceUrl,
      canGetSapienJwt: hasSalesforceSession,
    },
    
    // JWT retrieval test (via /services/apexrest/token/{scope})
    jwtTest,
    
    // Extracted Sapien identity (from JWT claims)
    sapienIdentity: {
      organizationId: orgId,
      userId: userId,
      username: username,
    },
    
    // Full JWT payload (for debugging)
    jwtPayload,
    
    // Sapien config (host from env, org ID from JWT or env)
    sapienConfig: {
      host: config.host ? '***configured***' : undefined,
      organizationId: config.organizationId,
      organizationIdSource: orgId ? 'jwt' : (config.organizationId ? 'env' : 'none'),
      directApiConfigured: hasDirectConfig,
    },
    
    // Available features based on current configuration
    features: {
      // These work with the Apex REST endpoint (JWT-based)
      sapienJwtAccess: hasSalesforceSession && jwtTest.success,
      realTimeCallStatus: hasSalesforceSession && jwtTest.success && hasDirectConfig,
      callRecordings: hasSalesforceSession && jwtTest.success && hasDirectConfig,
      
      // These work via Salesforce SOQL (always available with SF session)
      salesforceDataAccess: hasSalesforceSession,
    },
    
    // How to enable features
    setup: {
      forBasicFeatures: 'Authenticate with Salesforce OAuth',
      forAdvancedFeatures: 'Set SAPIEN_HOST environment variable (org ID is extracted from JWT automatically)',
      apexRestEndpoint: '/services/apexrest/token/{scope}',
      availableScopes: Object.values(SAPIEN_SCOPES).filter(s => s !== 'avs:api'),
    },
  });
};
