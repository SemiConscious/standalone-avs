import type { PageServerLoad, Actions } from './$types';
import { hasValidCredentials, querySalesforce, updateSalesforce, deleteSalesforce } from '$lib/server/salesforce';
import { 
  getSapienJwt, 
  getSapienOrganizationId, 
  savePolicyToSapien, 
  createPolicyInSapien,
  deletePolicyFromSapien,
  canGetSapienJwt,
  SAPIEN_SCOPES 
} from '$lib/server/sapien';
import { 
  syncEventSubscriptionsFromPolicy,
  deleteEventSubscriptionsForPolicy 
} from '$lib/server/events';
import { env } from '$env/dynamic/private';
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

const NAMESPACE = env.SALESFORCE_PACKAGE_NAMESPACE || 'nbavs';

// Map legacy Natterbox templateClass values to our editor node types
function mapLegacyNodeType(templateClass?: string, nodeType?: string): string {
  const classMap: Record<string, string> = {
    'ModFromPolicy': 'init',
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

  if (!hasValidCredentials(locals)) {
    // Return demo data for unauthenticated users
    return getDemoData(policyId);
  }

  try {
    // Fetch the policy
    // Using only fields confirmed to exist on CallFlow__c from routing-policies page
    const policyQuery = `
      SELECT Id, Name, ${NAMESPACE}__Description__c, ${NAMESPACE}__Body__c, 
             ${NAMESPACE}__Status__c, CreatedDate, LastModifiedDate
      FROM ${NAMESPACE}__CallFlow__c 
      WHERE Id = '${policyId}'
      LIMIT 1
    `;

    const policyResult = await querySalesforce(
      locals.instanceUrl!,
      locals.accessToken!,
      policyQuery
    );

    if (!policyResult.records || policyResult.records.length === 0) {
      throw error(404, 'Policy not found');
    }

    const rawPolicy = policyResult.records[0];
    
    // Parse the policy body JSON
    let body: PolicyBody = { nodes: [], edges: [] };
    try {
      const bodyField = rawPolicy[`${NAMESPACE}__Body__c`];
      if (bodyField) {
        const parsed = JSON.parse(bodyField);
        
        // Transform legacy Natterbox format to our expected format
        // Legacy nodes have x,y at root level, we need position: {x, y}
        const rawNodes = Array.isArray(parsed.nodes) ? parsed.nodes : [];
        const transformedNodes = rawNodes.map((node: Record<string, unknown>) => {
          // For Action container nodes, get a better label from the outputs
          let label = node.name || node.title || 'Node';
          const outputs = node.outputs as Array<Record<string, unknown>> | undefined;
          
          if (node.templateClass === 'ModAction' && outputs && outputs.length > 0) {
            // Use the first output's name/title as the label
            const firstOutput = outputs[0];
            label = (firstOutput.name || firstOutput.title || label) as string;
            
            // If there are multiple outputs, show count
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
        
        // Legacy format uses 'connections' array with {source: {nodeID, id}, dest: {nodeID, id}}
        // Our format uses 'edges' array with {id, source, target, sourceHandle, targetHandle}
        const rawConnections = Array.isArray(parsed.connections) ? parsed.connections : [];
        const rawEdges = Array.isArray(parsed.edges) ? parsed.edges : [];
        
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
          viewport: parsed.viewport || { 
            x: parsed.translateX || 0, 
            y: parsed.translateY || 0, 
            zoom: parsed.zoom || 1 
          },
        };
      }
    } catch (e) {
      console.warn('Failed to parse policy body:', e);
    }

    const policy: PolicyData = {
      id: rawPolicy.Id,
      name: rawPolicy.Name,
      description: rawPolicy[`${NAMESPACE}__Description__c`] || '',
      body,
      color: '#3b82f6', // Default color - field may not exist on all orgs
      grid: true, // Default grid - field may not exist on all orgs
      isActive: rawPolicy[`${NAMESPACE}__Status__c`] === 'Enabled',
      createdDate: rawPolicy.CreatedDate,
      lastModifiedDate: rawPolicy.LastModifiedDate,
    };

    // Fetch supporting data in parallel
    const [users, groups, sounds, phoneNumbers] = await Promise.all([
      fetchUsers(locals),
      fetchGroups(locals),
      fetchSounds(locals),
      fetchPhoneNumbers(locals),
    ]);

    return {
      policy,
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

async function fetchUsers(locals: App.Locals): Promise<UserData[]> {
  try {
    // Only query fields confirmed to exist
    const query = `
      SELECT Id, Name
      FROM ${NAMESPACE}__User__c
      ORDER BY Name
      LIMIT 1000
    `;
    const result = await querySalesforce(locals.instanceUrl!, locals.accessToken!, query);
    return (result.records || []).map((r: Record<string, unknown>) => ({
      id: r.Id as string,
      name: r.Name as string,
    }));
  } catch (e) {
    console.warn('Failed to fetch users:', e);
    return [];
  }
}

async function fetchGroups(locals: App.Locals): Promise<GroupData[]> {
  try {
    const query = `
      SELECT Id, Name
      FROM ${NAMESPACE}__Group__c
      ORDER BY Name
      LIMIT 1000
    `;
    const result = await querySalesforce(locals.instanceUrl!, locals.accessToken!, query);
    return (result.records || []).map((r: Record<string, unknown>) => ({
      id: r.Id as string,
      name: r.Name as string,
    }));
  } catch (e) {
    console.warn('Failed to fetch groups:', e);
    return [];
  }
}

async function fetchSounds(locals: App.Locals): Promise<SoundData[]> {
  try {
    // Sound__c object may not exist in all orgs, just query basic fields
    const query = `
      SELECT Id, Name
      FROM ${NAMESPACE}__Sound__c
      ORDER BY Name
      LIMIT 1000
    `;
    const result = await querySalesforce(locals.instanceUrl!, locals.accessToken!, query);
    return (result.records || []).map((r: Record<string, unknown>) => ({
      id: r.Id as string,
      name: r.Name as string,
    }));
  } catch (e) {
    // Sound__c object may not exist - this is expected in many orgs
    console.warn('Failed to fetch sounds (object may not exist):', e);
    return [];
  }
}

async function fetchPhoneNumbers(locals: App.Locals): Promise<PhoneNumberData[]> {
  try {
    const query = `
      SELECT Id, Name, ${NAMESPACE}__Number__c
      FROM ${NAMESPACE}__PhoneNumber__c
      ORDER BY Name
      LIMIT 1000
    `;
    const result = await querySalesforce(locals.instanceUrl!, locals.accessToken!, query);
    return (result.records || []).map((r: Record<string, unknown>) => ({
      id: r.Id as string,
      name: r.Name as string,
      number: r[`${NAMESPACE}__Number__c`] as string,
    }));
  } catch (e) {
    console.warn('Failed to fetch phone numbers:', e);
    return [];
  }
}

function getDemoData(policyId: string): PolicyEditorPageData {
  return {
    policy: {
      id: policyId,
      name: 'Demo Routing Policy',
      description: 'This is a demonstration routing policy',
      body: {
        nodes: [
          {
            id: 'init-1',
            type: 'init',
            position: { x: 50, y: 200 },
            data: { label: 'Start' },
          },
          {
            id: 'input-1',
            type: 'input',
            position: { x: 200, y: 100 },
            data: { 
              label: 'Inbound Number',
              phoneNumber: '+1 555-0100',
            },
          },
          {
            id: 'default-1',
            type: 'default',
            position: { x: 400, y: 200 },
            data: { 
              label: 'Call Queue',
              containerType: 'callQueue',
              queueName: 'Sales Queue',
            },
          },
          {
            id: 'output-1',
            type: 'output',
            position: { x: 650, y: 200 },
            data: { label: 'End' },
          },
        ],
        edges: [
          { id: 'e1', source: 'init-1', target: 'input-1' },
          { id: 'e2', source: 'input-1', target: 'default-1' },
          { id: 'e3', source: 'default-1', target: 'output-1' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
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
   * 
   * The save flow:
   * 1. Build the payload (Body__c for Salesforce, Policy__c for Sapien)
   * 2. Save to Sapien first (the actual routing engine)
   * 3. Save to Salesforce (the source of truth for UI)
   * 
   * This mirrors the behavior of CallFlowRemoting.saveCallFlow in the Apex code.
   */
  save: async ({ request, locals, params }) => {
    if (!hasValidCredentials(locals)) {
      return fail(401, { error: 'Not authenticated' });
    }

    try {
      const formData = await request.formData();
      const policyDataJson = formData.get('policy');
      
      if (!policyDataJson || typeof policyDataJson !== 'string') {
        return fail(400, { error: 'Policy data is required' });
      }

      const policyData = JSON.parse(policyDataJson) as BuildPayloadPolicy;
      
      // Fetch the current Salesforce config (API_v1__c)
      const configQuery = `
        SELECT Id, ${NAMESPACE}__DevOrgId__c, ${NAMESPACE}__ConnectorId__c
        FROM ${NAMESPACE}__API_v1__c
        LIMIT 1
      `;
      
      let config = {
        DevOrgId__c: '',
        ConnectorId__c: '',
      };
      
      try {
        const configResult = await querySalesforce(
          locals.instanceUrl!,
          locals.accessToken!,
          configQuery
        );
        if (configResult.records?.length > 0) {
          const rec = configResult.records[0] as Record<string, string>;
          config = {
            DevOrgId__c: rec[`${NAMESPACE}__DevOrgId__c`] || '',
            ConnectorId__c: rec[`${NAMESPACE}__ConnectorId__c`] || '',
          };
        }
      } catch (e) {
        console.warn('Failed to fetch API config, using defaults:', e);
      }

      // Build the save payload using the ported buildPayload function
      const payload = buildPayload({
        policy: policyData,
        config,
        sounds: [], // Could be passed from client if needed
      });

      // Get the existing policy's Natterbox ID (Id__c) if it exists
      let natterboxId: number | null = null;
      if (policyData.Id__c) {
        natterboxId = parseInt(String(policyData.Id__c), 10);
      } else {
        // Fetch it from Salesforce
        try {
          const idQuery = `
            SELECT ${NAMESPACE}__Id__c 
            FROM ${NAMESPACE}__CallFlow__c 
            WHERE Id = '${params.id}'
            LIMIT 1
          `;
          const idResult = await querySalesforce(
            locals.instanceUrl!,
            locals.accessToken!,
            idQuery
          );
          if (idResult.records?.length > 0) {
            const idValue = idResult.records[0][`${NAMESPACE}__Id__c`];
            if (idValue) {
              natterboxId = parseInt(String(idValue), 10);
            }
          }
        } catch (e) {
          console.warn('Failed to fetch policy Id__c:', e);
        }
      }

      // ========== SAVE TO SAPIEN ==========
      // This is what actually makes the routing work - Sapien is the call routing engine
      const sapienHost = env.SAPIEN_HOST;
      let sapienResult: { id?: number } | null = null;
      
      if (sapienHost && canGetSapienJwt(locals)) {
        try {
          // Get Sapien JWT with routing-policies:admin scope
          const jwt = await getSapienJwt(
            locals.instanceUrl!,
            locals.accessToken!,
            SAPIEN_SCOPES.ROUTING_POLICIES_ADMIN
          );
          
          const organizationId = getSapienOrganizationId();
          
          if (organizationId) {
            console.log(`[Sapien Save] Saving policy to Sapien org ${organizationId}, natterboxId: ${natterboxId}`);
            
            if (natterboxId) {
              // Update existing policy
              sapienResult = await savePolicyToSapien(
                sapienHost,
                jwt,
                organizationId,
                natterboxId,
                payload.Policy__c
              );
              console.log(`[Sapien Save] Updated policy ${natterboxId}`);
            } else {
              // Create new policy
              sapienResult = await createPolicyInSapien(
                sapienHost,
                jwt,
                organizationId,
                payload.Policy__c
              );
              natterboxId = sapienResult?.id ?? null;
              console.log(`[Sapien Save] Created new policy with ID ${natterboxId}`);
            }
          } else {
            console.warn('[Sapien Save] No organization ID found in JWT, skipping Sapien save');
          }
        } catch (e) {
          // Log but don't fail - Salesforce save is still important
          console.error('[Sapien Save] Error saving to Sapien:', e);
          // We could choose to fail here if Sapien save is critical
          // return fail(500, { error: `Failed to save to Natterbox: ${e instanceof Error ? e.message : 'Unknown error'}` });
        }
      } else {
        console.warn('[Sapien Save] Sapien not configured (SAPIEN_HOST missing or auth unavailable), saving to Salesforce only');
      }

      // ========== SAVE TO SALESFORCE ==========
      const updateData: Record<string, string | null> = {
        Name: payload.Name,
        [`${NAMESPACE}__Description__c`]: payload.Description__c,
        [`${NAMESPACE}__Body__c`]: payload.Body__c,
        [`${NAMESPACE}__Policy__c`]: payload.Policy__c,
      };
      
      // Set the Natterbox ID if we got one from Sapien (for new policies)
      if (natterboxId && !policyData.Id__c) {
        updateData[`${NAMESPACE}__Id__c`] = String(natterboxId);
      }
      
      // Only include Type__c if it's valid
      if (payload.Type__c) {
        updateData[`${NAMESPACE}__Type__c`] = payload.Type__c;
      }

      await updateSalesforce(
        locals.instanceUrl!,
        locals.accessToken!,
        `${NAMESPACE}__CallFlow__c`,
        params.id,
        updateData
      );

      // ========== SYNC EVENT SUBSCRIPTIONS ==========
      // Extract event nodes from the policy and sync subscriptions
      let eventsSynced = false;
      if (natterboxId && canGetSapienJwt(locals)) {
        try {
          const jwt = await getSapienJwt(
            locals.instanceUrl!,
            locals.accessToken!,
            SAPIEN_SCOPES.ROUTING_POLICIES_ADMIN
          );
          const organizationId = getSapienOrganizationId();
          
          if (organizationId) {
            // Extract event nodes from the policy body
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
              console.log(`[Events Sync] Synced ${eventNodes.length} event subscriptions`);
            }
          }
        } catch (e) {
          console.warn('[Events Sync] Failed to sync event subscriptions:', e);
          // Don't fail the save operation for event sync errors
        }
      }

      const savedToSapien = sapienResult !== null;
      return { 
        success: true, 
        message: savedToSapien 
          ? 'Policy saved successfully' 
          : 'Policy saved to Salesforce (Sapien sync not available)',
        natterboxId,
        savedToSapien,
        eventsSynced,
      };
    } catch (e) {
      console.error('Error saving policy:', e);
      return fail(500, { 
        error: e instanceof Error ? e.message : 'Failed to save policy' 
      });
    }
  },

  /**
   * Delete the policy from both Sapien and Salesforce
   * 
   * The delete flow:
   * 1. Get the Natterbox policy ID (Id__c from Salesforce)
   * 2. Delete from Sapien first (the actual routing engine)
   * 3. Delete from Salesforce (the source of truth for UI)
   * 
   * This mirrors the behavior of CallFlowRemoting.deleteCallFlow in the Apex code.
   */
  delete: async ({ locals, params }) => {
    if (!hasValidCredentials(locals)) {
      return fail(401, { error: 'Not authenticated' });
    }

    try {
      const policyId = params.id;
      
      // First, fetch the Natterbox ID (Id__c) from Salesforce
      let natterboxId: number | null = null;
      try {
        const idQuery = `
          SELECT ${NAMESPACE}__Id__c 
          FROM ${NAMESPACE}__CallFlow__c 
          WHERE Id = '${policyId}'
          LIMIT 1
        `;
        const idResult = await querySalesforce(
          locals.instanceUrl!,
          locals.accessToken!,
          idQuery
        );
        if (idResult.records?.length > 0) {
          const idValue = idResult.records[0][`${NAMESPACE}__Id__c`];
          if (idValue) {
            natterboxId = parseInt(String(idValue), 10);
          }
        }
      } catch (e) {
        console.warn('Failed to fetch policy Id__c:', e);
      }

      // ========== DELETE EVENT SUBSCRIPTIONS ==========
      // Delete any event subscriptions associated with this policy
      let eventsDeleted = 0;
      if (natterboxId && canGetSapienJwt(locals)) {
        try {
          const jwt = await getSapienJwt(
            locals.instanceUrl!,
            locals.accessToken!,
            SAPIEN_SCOPES.ROUTING_POLICIES_ADMIN
          );
          const organizationId = getSapienOrganizationId();
          
          if (organizationId) {
            eventsDeleted = await deleteEventSubscriptionsForPolicy(jwt, organizationId, natterboxId);
            console.log(`[Events Delete] Deleted ${eventsDeleted} event subscriptions`);
          }
        } catch (e) {
          console.warn('[Events Delete] Failed to delete event subscriptions:', e);
          // Continue with policy deletion even if event cleanup fails
        }
      }

      // ========== DELETE FROM SAPIEN ==========
      // This removes the policy from the call routing engine
      const sapienHost = env.SAPIEN_HOST;
      let deletedFromSapien = false;
      
      if (sapienHost && canGetSapienJwt(locals) && natterboxId) {
        try {
          // Get Sapien JWT with routing-policies:admin scope
          const jwt = await getSapienJwt(
            locals.instanceUrl!,
            locals.accessToken!,
            SAPIEN_SCOPES.ROUTING_POLICIES_ADMIN
          );
          
          const organizationId = getSapienOrganizationId();
          
          if (organizationId) {
            console.log(`[Sapien Delete] Deleting policy ${natterboxId} from org ${organizationId}`);
            
            await deletePolicyFromSapien(
              sapienHost,
              jwt,
              organizationId,
              natterboxId
            );
            deletedFromSapien = true;
            console.log(`[Sapien Delete] Successfully deleted policy ${natterboxId}`);
          } else {
            console.warn('[Sapien Delete] No organization ID found in JWT, skipping Sapien delete');
          }
        } catch (e) {
          // Log but continue - we still want to delete from Salesforce
          // A policy might not exist in Sapien (e.g., if it was never synced)
          console.error('[Sapien Delete] Error deleting from Sapien:', e);
        }
      } else if (!natterboxId) {
        console.warn('[Sapien Delete] No Natterbox ID found, skipping Sapien delete');
      } else {
        console.warn('[Sapien Delete] Sapien not configured (SAPIEN_HOST missing or auth unavailable), deleting from Salesforce only');
      }

      // ========== DELETE FROM SALESFORCE ==========
      await deleteSalesforce(
        locals.instanceUrl!,
        locals.accessToken!,
        `${NAMESPACE}__CallFlow__c`,
        policyId
      );

      return { 
        success: true, 
        message: deletedFromSapien 
          ? 'Policy deleted successfully' 
          : 'Policy deleted from Salesforce (Sapien sync not available or policy not in Sapien)',
        deletedFromSapien,
      };
    } catch (e) {
      console.error('Error deleting policy:', e);
      return fail(500, { 
        error: e instanceof Error ? e.message : 'Failed to delete policy' 
      });
    }
  },
};

