import type { PageServerLoad } from './$types';
import { hasValidCredentials } from '$lib/server/salesforce';
import { getSapienJwt, getSapienOrganizationId, canGetSapienJwt } from '$lib/server/sapien';
import { env } from '$env/dynamic/private';

export interface EditorPageData {
  isAuthenticated: boolean;
  config: {
    avsNamespace: string;
    urls: string;
    orgId: string | null;
    nbOrgId: string | null;
    reactControllerEnabled: boolean;
    routingPolicyEditorHost: string;
  };
  error?: string;
}

export const load: PageServerLoad = async ({ locals }) => {
  if (!hasValidCredentials(locals)) {
    return {
      isAuthenticated: false,
      config: {
        avsNamespace: 'nbavs',
        urls: '{}',
        orgId: null,
        nbOrgId: null,
        reactControllerEnabled: true,
        routingPolicyEditorHost: 'https://routing-policy-editor.natterbox.net',
      },
      error: 'Not authenticated. Please log in first.',
    } satisfies EditorPageData;
  }

  // Try to get Sapien JWT to populate org ID
  let nbOrgId: string | null = null;
  
  if (canGetSapienJwt(locals)) {
    try {
      // Get JWT with routing-policies scope to ensure we have org ID
      await getSapienJwt(
        locals.instanceUrl!,
        locals.accessToken!,
        'routing-policies:admin'
      );
      nbOrgId = String(getSapienOrganizationId() || '');
    } catch (e) {
      console.warn('Could not get Sapien JWT for routing policies:', e);
    }
  }

  // Host URLs (production values)
  const hostURLs: Record<string, string> = {
    'SapienHost': env.SAPIEN_HOST || 'https://sapien.redmatter.com',
    'GatekeeperHost': 'https://gatekeeper.redmatter.pub',
    'RoutingPolicyEditorHost': 'https://routing-policy-editor.natterbox.net',
    'CallFlowHost': 'https://callflow.redmatter.pub',
  };

  // Get Salesforce Org ID
  // We can get this from the instance URL or from a user info call
  let sfOrgId: string | null = null;
  try {
    const userInfoUrl = `${locals.instanceUrl}/services/oauth2/userinfo`;
    const response = await fetch(userInfoUrl, {
      headers: {
        'Authorization': `Bearer ${locals.accessToken}`,
      },
    });
    if (response.ok) {
      const userInfo = await response.json();
      sfOrgId = userInfo.organization_id || null;
    }
  } catch (e) {
    console.warn('Could not get Salesforce org ID:', e);
  }

  return {
    isAuthenticated: true,
    config: {
      avsNamespace: env.SALESFORCE_PACKAGE_NAMESPACE || 'nbavs',
      urls: JSON.stringify(hostURLs),
      orgId: sfOrgId,
      nbOrgId,
      reactControllerEnabled: true,
      routingPolicyEditorHost: 'https://routing-policy-editor.natterbox.net',
    },
  } satisfies EditorPageData;
};

