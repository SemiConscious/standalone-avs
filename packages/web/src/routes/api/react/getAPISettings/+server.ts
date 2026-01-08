import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hasValidCredentials, fetchApiSettings } from '$lib/server/salesforce';
import { getSapienOrganizationId, getApiSettings, getCachedApiSettings } from '$lib/server/sapien';

/**
 * Replicate ReactController.getAPISettings()
 * Returns: ConnectorId, DevOrgId, NotifyEmailAddress, OrganizationId
 * 
 * Now fetches real data from the Apex REST endpoint:
 * /services/apexrest/nbavs/HostUrlSettings/APISettings
 * 
 * This exposes the API_v1__c custom setting values.
 * 
 * GET /api/react/getAPISettings
 */
export const GET: RequestHandler = async ({ locals }) => {
  if (!hasValidCredentials(locals)) {
    return json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    // Try to get API settings from Salesforce
    const apiSettings = await getApiSettings(locals.instanceUrl!, locals.accessToken!);
    
    // Return settings structure similar to Salesforce ReactController.getAPISettings()
    // which returns [API_v1__c.getOrgDefaults()]
    const settings = [{
      Id: apiSettings.Id || null,
      ConnectorId__c: apiSettings.ConnectorId__c || null,
      DevOrgId__c: apiSettings.DevOrgId__c || null,
      NotifyEmailAddress__c: apiSettings.NotifyEmailAddress__c || null,
      OrganizationId__c: apiSettings.OrganizationId__c || null,
      // Also include other useful fields that ReactController exposes
      SipDomain__c: apiSettings.SipDomain__c || null,
      APIUserId__c: apiSettings.APIUserId__c || null,
    }];

    return json(settings);
  } catch (error) {
    // Fall back to cached data or JWT-derived data
    console.warn('Failed to fetch API settings from Salesforce, using fallback:', error);
    
    const cachedSettings = getCachedApiSettings();
    const organizationId = cachedSettings?.OrganizationId__c ?? getSapienOrganizationId();

    const settings = [{
      Id: cachedSettings?.Id || null,
      ConnectorId__c: cachedSettings?.ConnectorId__c || null,
      DevOrgId__c: cachedSettings?.DevOrgId__c || null,
      NotifyEmailAddress__c: cachedSettings?.NotifyEmailAddress__c || null,
      OrganizationId__c: organizationId,
      SipDomain__c: cachedSettings?.SipDomain__c || null,
      APIUserId__c: cachedSettings?.APIUserId__c || null,
    }];

    return json(settings);
  }
};

