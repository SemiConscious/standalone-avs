import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hasValidCredentials } from '$lib/server/salesforce';
import { getApiSettings, getCachedApiSettings, SAPIEN_HOSTS } from '$lib/server/sapien';
import { env } from '$env/dynamic/private';

/**
 * Replicate ReactController.getHostURLs()
 * Returns API host URLs from the API_v1__c custom setting.
 * 
 * Now fetches real data from the Apex REST endpoint:
 * /services/apexrest/nbavs/HostUrlSettings/APISettings
 * 
 * Falls back to production defaults if the fetch fails.
 * 
 * GET /api/react/getHostURLs
 */
export const GET: RequestHandler = async ({ locals }) => {
  if (!hasValidCredentials(locals)) {
    return json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Default production host URLs (fallback)
  const defaultHostURLs = {
    SapienHost: env.SAPIEN_HOST || SAPIEN_HOSTS.production.sapien,
    GatekeeperHost: SAPIEN_HOSTS.production.gatekeeper,
    WallboardAPIHost: SAPIEN_HOSTS.production.wallboardApi,
    RoutingPolicyEditorHost: SAPIEN_HOSTS.production.routingPolicyEditor,
    CallFlowHost: SAPIEN_HOSTS.production.callFlow,
    InsightSearchHost: SAPIEN_HOSTS.production.insightSearch,
    GeneralSettingsHost: SAPIEN_HOSTS.production.generalSettings,
    OmniChannelUIHost: 'https://omnichannel-client-v2.natterbox.net',
    OmniChannelRestHost: SAPIEN_HOSTS.production.omniChannelRest,
    OmniChannelEventsHost: SAPIEN_HOSTS.production.omniChannelEvents,
    OmniChannelTemplatesHost: SAPIEN_HOSTS.production.omniChannelTemplates,
    OmniChannelWebsocketHost: SAPIEN_HOSTS.production.omniChannelWebsocket,
    LuminaHost: SAPIEN_HOSTS.production.lumina,
    AuraHost: SAPIEN_HOSTS.production.aura,
    CTIRTHost: 'https://cti.natterbox.net',
    WebPhoneHost: SAPIEN_HOSTS.production.webPhone,
    LicenceAPIHost: SAPIEN_HOSTS.production.licenceApi,
    TelemetryHost: SAPIEN_HOSTS.production.telemetry,
  };

  try {
    // Try to get API settings from Salesforce
    const apiSettings = await getApiSettings(locals.instanceUrl!, locals.accessToken!);
    
    // Build host URLs from API settings, falling back to defaults
    const hostURLs = {
      SapienHost: apiSettings.Host__c || defaultHostURLs.SapienHost,
      GatekeeperHost: apiSettings.Gatekeeper_Host__c || defaultHostURLs.GatekeeperHost,
      WallboardAPIHost: apiSettings.WallboardAPIHost__c || defaultHostURLs.WallboardAPIHost,
      RoutingPolicyEditorHost: apiSettings.RoutingPolicyEditorHost__c || defaultHostURLs.RoutingPolicyEditorHost,
      CallFlowHost: apiSettings.CallFlow_Host__c || defaultHostURLs.CallFlowHost,
      InsightSearchHost: apiSettings.InsightSearchHost__c || defaultHostURLs.InsightSearchHost,
      GeneralSettingsHost: apiSettings.GeneralSettingsHost__c || defaultHostURLs.GeneralSettingsHost,
      OmniChannelUIHost: apiSettings.OmniChannelUIHost__c || defaultHostURLs.OmniChannelUIHost,
      OmniChannelRestHost: apiSettings.OmniChannelRestHost__c || defaultHostURLs.OmniChannelRestHost,
      OmniChannelEventsHost: apiSettings.OmniChannelEventsHost__c || defaultHostURLs.OmniChannelEventsHost,
      OmniChannelTemplatesHost: apiSettings.OmniChannelTemplatesHost__c || defaultHostURLs.OmniChannelTemplatesHost,
      OmniChannelWebsocketHost: apiSettings.OmniChannelWebsocketHost__c || defaultHostURLs.OmniChannelWebsocketHost,
      LuminaHost: apiSettings.LuminaHost__c || defaultHostURLs.LuminaHost,
      AuraHost: apiSettings.AuraHost__c || defaultHostURLs.AuraHost,
      CTIRTHost: defaultHostURLs.CTIRTHost, // Not in API_v1__c
      WebPhoneHost: apiSettings.WebPhoneHost__c || defaultHostURLs.WebPhoneHost,
      LicenceAPIHost: apiSettings.LicenceAPIHost__c || defaultHostURLs.LicenceAPIHost,
      TelemetryHost: apiSettings.TelemetryHost__c || defaultHostURLs.TelemetryHost,
    };

    return json(hostURLs);
  } catch (error) {
    // Fall back to cached settings or defaults
    console.warn('Failed to fetch host URLs from Salesforce, using defaults:', error);
    
    const cachedSettings = getCachedApiSettings();
    
    if (cachedSettings) {
      const hostURLs = {
        SapienHost: cachedSettings.Host__c || defaultHostURLs.SapienHost,
        GatekeeperHost: cachedSettings.Gatekeeper_Host__c || defaultHostURLs.GatekeeperHost,
        WallboardAPIHost: cachedSettings.WallboardAPIHost__c || defaultHostURLs.WallboardAPIHost,
        RoutingPolicyEditorHost: cachedSettings.RoutingPolicyEditorHost__c || defaultHostURLs.RoutingPolicyEditorHost,
        CallFlowHost: cachedSettings.CallFlow_Host__c || defaultHostURLs.CallFlowHost,
        InsightSearchHost: cachedSettings.InsightSearchHost__c || defaultHostURLs.InsightSearchHost,
        GeneralSettingsHost: cachedSettings.GeneralSettingsHost__c || defaultHostURLs.GeneralSettingsHost,
        OmniChannelUIHost: cachedSettings.OmniChannelUIHost__c || defaultHostURLs.OmniChannelUIHost,
        OmniChannelRestHost: cachedSettings.OmniChannelRestHost__c || defaultHostURLs.OmniChannelRestHost,
        OmniChannelEventsHost: cachedSettings.OmniChannelEventsHost__c || defaultHostURLs.OmniChannelEventsHost,
        OmniChannelTemplatesHost: cachedSettings.OmniChannelTemplatesHost__c || defaultHostURLs.OmniChannelTemplatesHost,
        OmniChannelWebsocketHost: cachedSettings.OmniChannelWebsocketHost__c || defaultHostURLs.OmniChannelWebsocketHost,
        LuminaHost: cachedSettings.LuminaHost__c || defaultHostURLs.LuminaHost,
        AuraHost: cachedSettings.AuraHost__c || defaultHostURLs.AuraHost,
        CTIRTHost: defaultHostURLs.CTIRTHost,
        WebPhoneHost: cachedSettings.WebPhoneHost__c || defaultHostURLs.WebPhoneHost,
        LicenceAPIHost: cachedSettings.LicenceAPIHost__c || defaultHostURLs.LicenceAPIHost,
        TelemetryHost: cachedSettings.TelemetryHost__c || defaultHostURLs.TelemetryHost,
      };
      return json(hostURLs);
    }

    return json(defaultHostURLs);
  }
};
