import type { PageServerLoad } from './$types';
import { tryCreateContextAndRepositories, isSalesforceContext } from '$lib/adapters';
import { canUseSapienApi, getJwt, getOrganizationId, getSapienHost } from '$lib/server/gatekeeper';
import { SAPIEN_SCOPES } from '$lib/server/sapien';
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
  const result = tryCreateContextAndRepositories(locals);

  if (!result) {
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

  const { ctx, isDemo } = result;

  if (isDemo) {
    return {
      isAuthenticated: true,
      config: {
        avsNamespace: 'nbavs',
        urls: '{}',
        orgId: 'demo-org-id',
        nbOrgId: 'demo-nb-org-id',
        reactControllerEnabled: true,
        routingPolicyEditorHost: 'https://routing-policy-editor.natterbox.net',
      },
    } satisfies EditorPageData;
  }

  if (!isSalesforceContext(ctx)) {
    return {
      isAuthenticated: true,
      config: {
        avsNamespace: 'nbavs',
        urls: '{}',
        orgId: null,
        nbOrgId: null,
        reactControllerEnabled: true,
        routingPolicyEditorHost: 'https://routing-policy-editor.natterbox.net',
      },
      error: 'Routing policy editor requires Salesforce context.',
    } satisfies EditorPageData;
  }

  // Try to get Sapien JWT to populate org ID
  let nbOrgId: string | null = null;
  
  if (canUseSapienApi(locals)) {
    try {
      // Get JWT with routing-policies scope to ensure we have org ID
      await getJwt(
        ctx.instanceUrl,
        ctx.accessToken,
        SAPIEN_SCOPES.ROUTING_POLICIES_ADMIN,
        locals.user?.id
      );
      nbOrgId = String(getOrganizationId() || '');
    } catch (e) {
      console.warn('Could not get Sapien JWT for routing policies:', e);
    }
  }

  // Host URLs (from API settings or production defaults)
  const sapienHost = getSapienHost() || env.SAPIEN_HOST || 'https://sapien.redmatter.com';
  const hostURLs: Record<string, string> = {
    'SapienHost': sapienHost,
    'GatekeeperHost': 'https://gatekeeper.redmatter.pub',
    'RoutingPolicyEditorHost': 'https://routing-policy-editor.natterbox.net',
    'CallFlowHost': 'https://callflow.redmatter.pub',
  };

  // Get Salesforce Org ID
  let sfOrgId: string | null = null;
  try {
    const userInfoUrl = `${ctx.instanceUrl}/services/oauth2/userinfo`;
    const response = await fetch(userInfoUrl, {
      headers: {
        'Authorization': `Bearer ${ctx.accessToken}`,
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
      avsNamespace: ctx.namespace,
      urls: JSON.stringify(hostURLs),
      orgId: sfOrgId,
      nbOrgId,
      reactControllerEnabled: true,
      routingPolicyEditorHost: 'https://routing-policy-editor.natterbox.net',
    },
  } satisfies EditorPageData;
};
