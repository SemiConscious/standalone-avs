import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hasValidCredentials } from '$lib/server/salesforce';
import { getSapienOrganizationId } from '$lib/server/sapien';

/**
 * Replicate ReactController.getAPISettings()
 * Returns: ConnectorId, DevOrgId, NotifyEmailAddress, OrganizationId
 * 
 * Since API_v1__c is protected, we get OrganizationId from the JWT
 * and provide placeholders for other values.
 * 
 * GET /api/react/getAPISettings
 */
export const GET: RequestHandler = async ({ locals }) => {
  if (!hasValidCredentials(locals)) {
    return json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Get org ID from cached JWT (if available)
  const organizationId = getSapienOrganizationId();

  // Return settings structure similar to Salesforce
  // These are the fields exposed by ReactController.getAPISettings()
  const settings = [{
    Id: null, // We don't have this
    ConnectorId__c: null, // We can't access this
    DevOrgId__c: null, // We can't access this
    NotifyEmailAddress__c: null, // We can't access this
    OrganizationId__c: organizationId, // From JWT
  }];

  return json(settings);
};

