import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hasValidCredentials } from '$lib/server/salesforce';
import { env } from '$env/dynamic/private';

/**
 * Replicate ReactController.getHostURLs()
 * Returns API host URLs - since we can't read from API_v1__c (protected),
 * we provide them from environment variables or hardcoded production values.
 * 
 * GET /api/react/getHostURLs
 */
export const GET: RequestHandler = async ({ locals }) => {
  if (!hasValidCredentials(locals)) {
    return json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Production host URLs (from Natterbox_API.Production.md-meta.xml)
  const hostURLs: Record<string, string> = {
    'SapienHost': env.SAPIEN_HOST || 'https://sapien.redmatter.com',
    'GatekeeperHost': 'https://gatekeeper.redmatter.pub',
    'WallboardAPIHost': 'https://flightdeck.natterbox.net',
    'RoutingPolicyEditorHost': 'https://routing-policy-editor.natterbox.net',
    'CallFlowHost': 'https://callflow.redmatter.pub',
    'InsightSearchHost': 'https://insight-search.natterbox.net',
    'GeneralSettingsHost': 'https://omnisettings.natterbox.net',
    'OmniChannelUIHost': 'https://omnichannel-client-v2.natterbox.net',
    'OmniChannelRestHost': 'https://omnichannel-us.natterbox.net',
    'OmniChannelEventsHost': 'https://external-events-us.natterbox.net',
    'OmniChannelTemplatesHost': 'https://message-templates-us.natterbox.net',
    'OmniChannelWebsocketHost': 'wss://omnichannelws-us.natterbox.net',
    'LuminaHost': 'https://lumina.natterbox.net',
    'AuraHost': 'https://aura.natterbox.net',
    'CTIRTHost': 'https://cti.natterbox.net',
    'WebPhoneHost': 'https://webphone.natterbox.net',
    'LicenceAPIHost': 'https://licence-api.redmatter.pub',
    'TelemetryHost': 'https://nbtelemetry-beta.herokuapp.com',
  };

  return json(hostURLs);
};

