import type { PageServerLoad, Actions } from './$types';
import { tryCreateContextAndRepositories, isSalesforceContext } from '$lib/adapters';
import { 
  savePolicyToSapien, 
  createPolicyInSapien,
  deletePolicyFromSapien,
  SAPIEN_SCOPES 
} from '$lib/server/sapien';
import { 
  canUseSapienApi,
  getJwt,
  getOrganizationId,
  getSapienHost
} from '$lib/server/gatekeeper';
import { 
  syncEventSubscriptionsFromPolicy,
  deleteEventSubscriptionsForPolicy 
} from '$lib/server/events';
import { error, fail } from '@sveltejs/kit';
import { buildPayload, type PolicyData as BuildPayloadPolicy } from '$lib/policy-editor/buildPayload';

export interface PolicyEditorPageData {
  policy: PolicyData | null;
  users: UserData[];
  groups: GroupData[];
  sounds: SoundData[];
  phoneNumbers: PhoneNumberData[];
  isAuthenticated: boolean;
  isDemo: boolean;
  error?: string;
}

export interface PolicyData {
  id: string;
  name: string;
  description: string;
  body: PolicyBody;
  color?: string;
  grid?: boolean;
  isActive: boolean;
  createdDate: string;
  lastModifiedDate: string;
  platformId?: number;
}

export interface PolicyBody {
  nodes: PolicyNode[];
  edges: PolicyEdge[];
  viewport?: { x: number; y: number; zoom: number };
  navigator?: unknown;
  navigatorPositionIndex?: number;
}

export interface PolicyNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  parentNode?: string;
  extent?: string;
  expandParent?: boolean;
}

export interface PolicyEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  data?: Record<string, unknown>;
}

export interface UserData {
  id: string;
  name: string;
  email?: string;
}

export interface GroupData {
  id: string;
  name: string;
}

export interface SoundData {
  id: string;
  name: string;
  url?: string;
}

export interface PhoneNumberData {
  id: string;
  name: string;
  number: string;
}

// Map legacy Natterbox templateClass values to our editor node types
function mapLegacyNodeType(templateClass?: string, nodeType?: string): string {
  const classMap: Record<string, string> = {
    'ModFromPolicy': 'fromPolicy',
    'ModNumber': 'inboundNumber',
    'ModNumber_Public': 'inboundNumber',
    'ModAction': 'default',
    'ModAction_Say': 'speak',
    'ModAction_Record': 'recordCall',
    'ModAction_Notify': 'notify',
    'ModConnect': 'connectCall',
    'ModConnector_SFQuery': 'queryObject',
    'ModVoicemail': 'voicemail',
    'ModHuntGroup': 'huntGroup',
    'ModCallQueue': 'callQueue',
    'ModRule': 'rule',
    'ModDevelop_Script': 'default',
  };
  
  if (templateClass && classMap[templateClass]) {
    return classMap[templateClass];
  }
  
  // Fallback to node type
  const typeMap: Record<string, string> = {
    'SYSTEM': 'init',
    'CALL': 'default',
    'OUTPUT': 'output',
  };
  
  return typeMap[nodeType || ''] || 'default';
}

export const load: PageServerLoad = async ({ params, locals }) => {
  const policyId = params.id;

  // Return demo data for explicit 'demo' ID
  if (policyId === 'demo') {
    return getDemoData(policyId);
  }

  const result = tryCreateContextAndRepositories(locals);

  // Not authenticated - show demo data
  if (!result) {
    return getDemoData(policyId);
  }

  const { repos, isDemo } = result;

  if (isDemo) {
    return getDemoData(policyId);
  }

  try {
    // Fetch the policy using repository
    const policy = await repos.routingPolicies.findById(policyId);
    
    console.log('[PolicyEditor] Fetched policy:', policy?.id, policy?.name, 'body length:', policy?.body ? String(policy.body).length : 0);
    
    if (!policy) {
      throw error(404, 'Policy not found');
    }

    // Parse the policy body JSON
    let body: PolicyBody = { nodes: [], edges: [] };
    if (policy.body) {
      try {
        const bodyData = typeof policy.body === 'string' ? JSON.parse(policy.body) : policy.body;
        
        // Transform legacy Natterbox format to our expected format
        const rawNodes = Array.isArray(bodyData.nodes) ? bodyData.nodes : [];
        const transformedNodes = rawNodes.map((node: Record<string, unknown>) => {
          let label = node.name || node.title || 'Node';
          const outputs = node.outputs as Array<Record<string, unknown>> | undefined;
          
          if (node.templateClass === 'ModAction' && outputs && outputs.length > 0) {
            const firstOutput = outputs[0];
            label = (firstOutput.name || firstOutput.title || label) as string;
            if (outputs.length > 1) {
              label = `${label} (+${outputs.length - 1})`;
            }
          }
          
          return {
            id: node.id as string,
            type: mapLegacyNodeType(node.templateClass as string, node.type as string),
            position: { 
              x: (node.x as number) || 0, 
              y: (node.y as number) || 0 
            },
            data: {
              label,
              description: node.description,
              templateClass: node.templateClass,
              templateId: node.templateId,
              config: node.config,
              variables: node.variables,
              outputs: node.outputs,
              subItems: node.subItems,
              ...node
            },
            width: node.width as number,
            height: node.height as number,
          };
        });
        
        const rawConnections = Array.isArray(bodyData.connections) ? bodyData.connections : [];
        const rawEdges = Array.isArray(bodyData.edges) ? bodyData.edges : [];
        
        const transformedEdges = rawConnections.length > 0 
          ? rawConnections.map((conn: Record<string, unknown>, index: number) => {
              const source = conn.source as { nodeID: string; id: string } | undefined;
              const dest = conn.dest as { nodeID: string; id: string } | undefined;
              return {
                id: `edge-${index}`,
                source: source?.nodeID || '',
                target: dest?.nodeID || '',
                sourceHandle: source?.id,
                targetHandle: dest?.id,
              };
            })
          : rawEdges;
        
        body = {
          nodes: transformedNodes,
          edges: transformedEdges,
          viewport: bodyData.viewport || { 
            x: bodyData.translateX || 0, 
            y: bodyData.translateY || 0, 
            zoom: bodyData.zoom || 1 
          },
        };
      } catch (e) {
        console.warn('Failed to parse policy body:', e);
      }
    }

    const policyData: PolicyData = {
      id: policy.id,
      name: policy.name,
      description: policy.description,
      body,
      color: '#3b82f6',
      grid: true,
      isActive: policy.status === 'active',
      createdDate: policy.createdDate || new Date().toISOString(),
      lastModifiedDate: policy.lastModifiedDate || new Date().toISOString(),
      platformId: policy.platformId,
    };

    // Fetch supporting data in parallel using repositories
    const [userResult, groupResult, soundResult, phoneResult] = await Promise.all([
      repos.users.findAll({ page: 1, pageSize: 1000 }),
      repos.groups.findAll({ page: 1, pageSize: 1000 }),
      repos.sounds.findAll({ page: 1, pageSize: 1000 }),
      repos.phoneNumbers.findAll({ page: 1, pageSize: 1000 }),
    ]);

    const users: UserData[] = userResult.items.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
    }));

    const groups: GroupData[] = groupResult.items.map(g => ({
      id: g.id,
      name: g.name,
    }));

    const sounds: SoundData[] = soundResult.items.map(s => ({
      id: s.id,
      name: s.name,
    }));

    const phoneNumbers: PhoneNumberData[] = phoneResult.items.map(p => ({
      id: p.id,
      name: p.name,
      number: p.number,
    }));

    return {
      policy: policyData,
      users,
      groups,
      sounds,
      phoneNumbers,
      isAuthenticated: true,
      isDemo: false,
    } satisfies PolicyEditorPageData;
  } catch (e) {
    console.error('Error loading policy:', e);
    
    if ((e as { status?: number }).status === 404) {
      throw e;
    }

    return {
      policy: null,
      users: [],
      groups: [],
      sounds: [],
      phoneNumbers: [],
      isAuthenticated: true,
      isDemo: false,
      error: e instanceof Error ? e.message : 'Failed to load policy',
    } satisfies PolicyEditorPageData;
  }
};

function getDemoData(policyId: string): PolicyEditorPageData {
  return {
    policy: {
      id: policyId,
      name: 'Demo Routing Policy',
      description: 'This is a demonstration routing policy showing all node types',
      body: {
        nodes: [
          {
            id: 'inbound-1',
            type: 'inboundNumber',
            position: { x: 50, y: 50 },
            data: { label: 'Inbound Number', phoneNumber: '+1 555-0100' },
          },
          {
            id: 'action-1',
            type: 'action',
            position: { x: 50, y: 250 },
            data: { label: 'Action', containerType: 'action' },
          },
          {
            id: 'finish-1',
            type: 'finish',
            position: { x: 550, y: 450 },
            data: { label: 'Finish' },
          },
        ],
        edges: [
          { id: 'e1', source: 'inbound-1', target: 'action-1' },
          { id: 'e2', source: 'action-1', target: 'finish-1' },
        ],
        viewport: { x: 0, y: 0, zoom: 0.8 },
      },
      color: '#3b82f6',
      grid: true,
      isActive: true,
      createdDate: new Date().toISOString(),
      lastModifiedDate: new Date().toISOString(),
    },
    users: [
      { id: 'u1', name: 'John Smith', email: 'john@example.com' },
      { id: 'u2', name: 'Jane Doe', email: 'jane@example.com' },
    ],
    groups: [
      { id: 'g1', name: 'Sales' },
      { id: 'g2', name: 'Support' },
    ],
    sounds: [
      { id: 's1', name: 'Hold Music 1' },
      { id: 's2', name: 'Welcome Message' },
    ],
    phoneNumbers: [
      { id: 'p1', name: 'Main Line', number: '+1 555-0100' },
      { id: 'p2', name: 'Support Line', number: '+1 555-0200' },
    ],
    isAuthenticated: false,
    isDemo: true,
  };
}

/**
 * Form actions for saving and managing the policy
 */
export const actions: Actions = {
  /**
   * Save the policy to both Sapien and Salesforce
   */
  save: async ({ request, locals, params }) => {
    const result = tryCreateContextAndRepositories(locals);
    if (!result) {
      return fail(401, { error: 'Not authenticated' });
    }

    const { repos, isDemo, ctx } = result;
    if (isDemo) {
      return fail(400, { error: 'Not available in demo mode' });
    }

    if (!isSalesforceContext(ctx)) {
      return fail(400, { error: 'Policy editing requires Salesforce context' });
    }

    try {
      const formData = await request.formData();
      const policyDataJson = formData.get('policy');
      
      if (!policyDataJson || typeof policyDataJson !== 'string') {
        return fail(400, { error: 'Policy data is required' });
      }

      const policyData = JSON.parse(policyDataJson) as BuildPayloadPolicy;
      
      // Get the existing policy's Natterbox ID (platformId) if it exists
      let natterboxId: number | null = policyData.Id__c ? parseInt(String(policyData.Id__c), 10) : null;
      
      if (!natterboxId) {
        // Fetch it from the repository
        const existingPolicy = await repos.routingPolicies.findById(params.id);
        if (existingPolicy?.platformId) {
          natterboxId = existingPolicy.platformId;
        }
      }

      // Build the save payload
      const payload = buildPayload({
        policy: policyData,
        config: { DevOrgId__c: '', ConnectorId__c: '' },
        sounds: [],
      });

      // ========== SAVE TO SAPIEN ==========
      let sapienResult: { id?: number } | null = null;
      
      if (canUseSapienApi(locals)) {
        try {
          const jwt = await getJwt(
            ctx.instanceUrl,
            ctx.accessToken,
            SAPIEN_SCOPES.ROUTING_POLICIES_ADMIN,
            locals.user?.id
          );
          
          const organizationId = getOrganizationId();
          const sapienHost = getSapienHost();
          
          if (organizationId && sapienHost) {
            if (natterboxId) {
              sapienResult = await savePolicyToSapien(sapienHost, jwt, organizationId, natterboxId, payload.Policy__c);
            } else {
              sapienResult = await createPolicyInSapien(sapienHost, jwt, organizationId, payload.Policy__c);
              natterboxId = sapienResult?.id ?? null;
            }
          }
        } catch (e) {
          console.error('[Sapien Save] Error saving to Sapien:', e);
        }
      }

      // ========== SAVE TO REPOSITORY ==========
      const updateResult = await repos.routingPolicies.update(params.id, {
        name: payload.Name,
        description: payload.Description__c,
        body: payload.Body__c,
      });

      if (!updateResult.success) {
        return fail(500, { error: updateResult.error || 'Failed to save policy' });
      }

      // ========== SYNC EVENT SUBSCRIPTIONS ==========
      let eventsSynced = false;
      if (natterboxId && canUseSapienApi(locals)) {
        try {
          const jwt = await getJwt(ctx.instanceUrl, ctx.accessToken, SAPIEN_SCOPES.ROUTING_POLICIES_ADMIN, locals.user?.id);
          const organizationId = getOrganizationId();
          
          if (organizationId) {
            const nodes = policyData.nodes || [];
            const eventNodes = nodes
              .filter((n: { type?: string; data?: Record<string, unknown> }) => 
                n.type === 'event' || n.data?.templateClass === 'ModEvent'
              )
              .map((n: { id: string; data?: Record<string, unknown> }) => ({
                id: n.id,
                name: String(n.data?.label || n.data?.name || 'Event'),
                eventType: String(n.data?.eventType || 'salesforce'),
                enabled: Boolean(n.data?.enabled ?? true),
                config: n.data?.config as Record<string, unknown> | undefined,
                subscriptionId: n.data?.subscriptionId as string | undefined,
              }));
            
            if (eventNodes.length > 0) {
              await syncEventSubscriptionsFromPolicy(jwt, organizationId, natterboxId, eventNodes);
              eventsSynced = true;
            }
          }
        } catch (e) {
          console.warn('[Events Sync] Failed to sync event subscriptions:', e);
        }
      }

      return { 
        success: true, 
        message: sapienResult !== null ? 'Policy saved successfully' : 'Policy saved (Sapien sync not available)',
        natterboxId,
        savedToSapien: sapienResult !== null,
        eventsSynced,
      };
    } catch (e) {
      console.error('Error saving policy:', e);
      return fail(500, { error: e instanceof Error ? e.message : 'Failed to save policy' });
    }
  },

  /**
   * Delete the policy from both Sapien and Salesforce
   */
  delete: async ({ locals, params }) => {
    const result = tryCreateContextAndRepositories(locals);
    if (!result) {
      return fail(401, { error: 'Not authenticated' });
    }

    const { repos, isDemo, ctx } = result;
    if (isDemo) {
      return fail(400, { error: 'Not available in demo mode' });
    }

    if (!isSalesforceContext(ctx)) {
      return fail(400, { error: 'Policy deletion requires Salesforce context' });
    }

    try {
      const policyId = params.id;
      
      // Get the Natterbox ID from the repository
      const existingPolicy = await repos.routingPolicies.findById(policyId);
      const natterboxId = existingPolicy?.platformId ?? null;

      // ========== DELETE EVENT SUBSCRIPTIONS ==========
      if (natterboxId && canUseSapienApi(locals)) {
        try {
          const jwt = await getJwt(ctx.instanceUrl, ctx.accessToken, SAPIEN_SCOPES.ROUTING_POLICIES_ADMIN, locals.user?.id);
          const organizationId = getOrganizationId();
          
          if (organizationId) {
            await deleteEventSubscriptionsForPolicy(jwt, organizationId, natterboxId);
          }
        } catch (e) {
          console.warn('[Events Delete] Failed to delete event subscriptions:', e);
        }
      }

      // ========== DELETE FROM SAPIEN ==========
      let deletedFromSapien = false;
      
      if (canUseSapienApi(locals) && natterboxId) {
        try {
          const jwt = await getJwt(ctx.instanceUrl, ctx.accessToken, SAPIEN_SCOPES.ROUTING_POLICIES_ADMIN, locals.user?.id);
          const organizationId = getOrganizationId();
          const sapienHost = getSapienHost();
          
          if (organizationId && sapienHost) {
            await deletePolicyFromSapien(sapienHost, jwt, organizationId, natterboxId);
            deletedFromSapien = true;
          }
        } catch (e) {
          console.error('[Sapien Delete] Error deleting from Sapien:', e);
        }
      }

      // ========== DELETE FROM REPOSITORY ==========
      const deleteResult = await repos.routingPolicies.delete(policyId);

      if (!deleteResult.success) {
        return fail(500, { error: deleteResult.error || 'Failed to delete policy' });
      }

      return { 
        success: true, 
        message: deletedFromSapien ? 'Policy deleted successfully' : 'Policy deleted (Sapien sync not available)',
        deletedFromSapien,
      };
    } catch (e) {
      console.error('Error deleting policy:', e);
      return fail(500, { error: e instanceof Error ? e.message : 'Failed to delete policy' });
    }
  },
};
