import { querySalesforce, hasValidCredentials, createSalesforce, deleteSalesforce, updateSalesforce } from '$lib/server/salesforce';
import { 
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
import { env } from '$env/dynamic/private';
import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';

const NAMESPACE = env.SALESFORCE_PACKAGE_NAMESPACE || 'nbavs';

interface SalesforceCallFlow {
  Id: string;
  Name: string;
  nbavs__Id__c: number;
  nbavs__Source__c: string;
  nbavs__Type__c: string;
  nbavs__Status__c: string;
  nbavs__Description__c: string;
  CreatedById: string;
  CreatedBy?: { Id: string; Name: string };
  CreatedDate: string;
  LastModifiedById: string;
  LastModifiedBy?: { Id: string; Name: string };
  LastModifiedDate: string;
}

interface SalesforcePhoneNumber {
  Id: string;
  Name: string;
  nbavs__Number__c: string;
  nbavs__CallFlow__c: string;
}

export interface RoutingPolicy {
  id: string;
  apiId: number;
  name: string;
  source: string;
  type: string;
  status: string;
  description: string;
  createdById: string;
  createdByName: string;
  createdDate: string;
  lastModifiedById: string;
  lastModifiedByName: string;
  lastModifiedDate: string;
  phoneNumbers: string[];
}

// Demo data
const DEMO_POLICIES: RoutingPolicy[] = [
  {
    id: '1',
    apiId: 101,
    name: 'Main Office IVR',
    source: 'Inbound',
    type: 'IVR',
    status: 'Enabled',
    description: 'Main IVR for incoming calls to the office',
    createdById: 'user1',
    createdByName: 'John Smith',
    createdDate: '2025-12-01T10:00:00Z',
    lastModifiedById: 'user1',
    lastModifiedByName: 'John Smith',
    lastModifiedDate: '2026-01-05T14:30:00Z',
    phoneNumbers: ['+44 20 3510 0500'],
  },
  {
    id: '2',
    apiId: 102,
    name: 'Support Queue',
    source: 'Inbound',
    type: 'Queue',
    status: 'Enabled',
    description: 'Call queue for support department',
    createdById: 'user2',
    createdByName: 'Jane Doe',
    createdDate: '2025-11-15T09:00:00Z',
    lastModifiedById: 'user2',
    lastModifiedByName: 'Jane Doe',
    lastModifiedDate: '2026-01-04T11:20:00Z',
    phoneNumbers: ['+44 20 3510 0501'],
  },
  {
    id: '3',
    apiId: 103,
    name: 'Sales Hunt Group',
    source: 'Inbound',
    type: 'Hunt',
    status: 'Enabled',
    description: 'Hunt group for sales team',
    createdById: 'user1',
    createdByName: 'John Smith',
    createdDate: '2025-10-20T14:00:00Z',
    lastModifiedById: 'user3',
    lastModifiedByName: 'Bob Johnson',
    lastModifiedDate: '2026-01-03T16:45:00Z',
    phoneNumbers: ['+44 20 3510 0502', '+44 20 3510 0503'],
  },
  {
    id: '4',
    apiId: 104,
    name: 'After Hours',
    source: 'Inbound',
    type: 'IVR',
    status: 'Disabled',
    description: 'After hours voicemail and routing',
    createdById: 'user2',
    createdByName: 'Jane Doe',
    createdDate: '2025-09-10T08:00:00Z',
    lastModifiedById: 'user2',
    lastModifiedByName: 'Jane Doe',
    lastModifiedDate: '2025-12-20T09:00:00Z',
    phoneNumbers: [],
  },
  {
    id: '5',
    apiId: 105,
    name: 'Outbound Dialer',
    source: 'Outbound',
    type: 'Dialer',
    status: 'Enabled',
    description: 'Outbound dialing rules',
    createdById: 'user3',
    createdByName: 'Bob Johnson',
    createdDate: '2025-08-01T12:00:00Z',
    lastModifiedById: 'user1',
    lastModifiedByName: 'John Smith',
    lastModifiedDate: '2026-01-02T10:15:00Z',
    phoneNumbers: [],
  },
];

export const load: PageServerLoad = async ({ locals }) => {
  // Demo mode
  if (env.PUBLIC_DEMO_MODE === 'true' || env.PUBLIC_DEMO_MODE === '1') {
    return { policies: DEMO_POLICIES, isDemo: true, totalCount: DEMO_POLICIES.length };
  }

  // Check credentials
  if (!hasValidCredentials(locals)) {
    return { policies: [], isDemo: false, totalCount: 0, error: 'Not authenticated' };
  }

  try {
    // Fetch call flows
    const callFlowSoql = `
      SELECT Id, nbavs__Id__c, Name, nbavs__Source__c, nbavs__Type__c, nbavs__Status__c,
             nbavs__Description__c, CreatedById, CreatedBy.Id, CreatedBy.Name, CreatedDate,
             LastModifiedById, LastModifiedBy.Id, LastModifiedBy.Name, LastModifiedDate
      FROM nbavs__CallFlow__c
      ORDER BY nbavs__Source__c, nbavs__Type__c, Name
      LIMIT 5000
    `;

    const callFlowResult = await querySalesforce<SalesforceCallFlow>(
      locals.instanceUrl!,
      locals.accessToken!,
      callFlowSoql
    );

    // Fetch phone numbers with call flow assignments
    const phoneNumberSoql = `
      SELECT Id, Name, nbavs__Number__c, nbavs__CallFlow__c
      FROM nbavs__PhoneNumber__c
      WHERE nbavs__CallFlow__c != null
      LIMIT 50000
    `;

    let phoneNumberMap = new Map<string, string[]>();
    try {
      const phoneNumberResult = await querySalesforce<SalesforcePhoneNumber>(
        locals.instanceUrl!,
        locals.accessToken!,
        phoneNumberSoql
      );
      phoneNumberResult.records.forEach((pn) => {
        if (pn.nbavs__CallFlow__c) {
          const existing = phoneNumberMap.get(pn.nbavs__CallFlow__c) || [];
          existing.push(pn.nbavs__Number__c || pn.Name);
          phoneNumberMap.set(pn.nbavs__CallFlow__c, existing);
        }
      });
    } catch (e) {
      console.warn('Failed to fetch phone number assignments:', e);
    }

    const policies: RoutingPolicy[] = callFlowResult.records.map((cf) => ({
      id: cf.Id,
      apiId: cf.nbavs__Id__c || 0,
      name: cf.Name,
      source: cf.nbavs__Source__c || 'Inbound',
      type: cf.nbavs__Type__c || 'IVR',
      status: cf.nbavs__Status__c || 'Disabled',
      description: cf.nbavs__Description__c || '',
      createdById: cf.CreatedBy?.Id || cf.CreatedById,
      createdByName: cf.CreatedBy?.Name || 'Unknown',
      createdDate: cf.CreatedDate,
      lastModifiedById: cf.LastModifiedBy?.Id || cf.LastModifiedById,
      lastModifiedByName: cf.LastModifiedBy?.Name || 'Unknown',
      lastModifiedDate: cf.LastModifiedDate,
      phoneNumbers: phoneNumberMap.get(cf.Id) || [],
    }));

    return { policies, isDemo: false, totalCount: callFlowResult.totalSize };
  } catch (error) {
    console.error('Failed to fetch routing policies:', error);
    return { policies: [], isDemo: false, totalCount: 0, error: 'Failed to load routing policies' };
  }
};

export const actions: Actions = {
  /**
   * Create a new routing policy
   * Creates in both Salesforce and Sapien (if configured)
   */
  create: async ({ locals, request }) => {
    if (!hasValidCredentials(locals)) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string || '';
    const policyType = formData.get('type') as string || 'Call';

    if (!name || name.trim().length === 0) {
      return fail(400, { error: 'Policy name is required' });
    }

    try {
      // Build default policy body - empty policy with just a start node
      const defaultBody = JSON.stringify({
        nodes: [
          {
            id: 'init-1',
            type: 'init',
            position: { x: 100, y: 200 },
            data: { label: 'Start', templateId: 1, templateClass: 'ModFromPolicy' }
          }
        ],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 }
      });

      // Default policy JSON for Sapien
      const defaultPolicyJson = JSON.stringify({
        name: name.trim(),
        enabled: false,
        type: policyType,
        items: []
      });

      // ========== CREATE IN SAPIEN FIRST ==========
      // This gets us the Natterbox policy ID
      let natterboxId: number | null = null;
      
      if (canUseSapienApi(locals)) {
        try {
          // Get JWT with routing-policies:admin scope for policy management
          const jwt = await getJwt(
            locals.instanceUrl!,
            locals.accessToken!,
            SAPIEN_SCOPES.ROUTING_POLICIES_ADMIN,
            locals.user?.id
          );
          
          const organizationId = getOrganizationId();
          const sapienHost = getSapienHost();
          
          if (organizationId && sapienHost) {
            console.log(`[Sapien Create] Creating policy in org ${organizationId}`);
            
            const sapienResult = await createPolicyInSapien(
              sapienHost,
              jwt,
              organizationId,
              defaultPolicyJson
            );
            natterboxId = sapienResult?.id ?? null;
            console.log(`[Sapien Create] Created policy with ID ${natterboxId}`);
          }
        } catch (e) {
          console.error('[Sapien Create] Error:', e);
          // Continue without Sapien ID - we'll create just in Salesforce
        }
      }

      // ========== CREATE IN SALESFORCE ==========
      const createData: Record<string, string | number | null> = {
        Name: name.trim(),
        [`${NAMESPACE}__Description__c`]: description,
        [`${NAMESPACE}__Body__c`]: defaultBody,
        [`${NAMESPACE}__Policy__c`]: defaultPolicyJson,
        [`${NAMESPACE}__Status__c`]: 'Disabled',
        [`${NAMESPACE}__Type__c`]: policyType,
        [`${NAMESPACE}__Source__c`]: 'Inbound',
      };
      
      if (natterboxId) {
        createData[`${NAMESPACE}__Id__c`] = natterboxId;
      }

      const result = await createSalesforce<{ id: string }>(
        locals.instanceUrl!,
        locals.accessToken!,
        `${NAMESPACE}__CallFlow__c`,
        createData
      );

      // Redirect to the editor for the new policy
      throw redirect(303, `/policy-editor/${result.id}`);
    } catch (e) {
      // Re-throw redirects
      if (e && typeof e === 'object' && 'status' in e && (e as { status: number }).status >= 300 && (e as { status: number }).status < 400) {
        throw e;
      }
      
      console.error('Error creating policy:', e);
      return fail(500, { 
        error: e instanceof Error ? e.message : 'Failed to create policy' 
      });
    }
  },

  /**
   * Delete a routing policy
   * Deletes from both Salesforce and Sapien (if configured)
   */
  delete: async ({ locals, request }) => {
    if (!hasValidCredentials(locals)) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const policyId = formData.get('policyId') as string;

    if (!policyId) {
      return fail(400, { error: 'Policy ID is required' });
    }

    try {
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
          const record = idResult.records[0] as Record<string, unknown>;
          const idValue = record[`${NAMESPACE}__Id__c`];
          if (idValue) {
            natterboxId = parseInt(String(idValue), 10);
          }
        }
      } catch (e) {
        console.warn('Failed to fetch policy Id__c:', e);
      }

      // ========== DELETE FROM SAPIEN ==========
      if (canUseSapienApi(locals) && natterboxId) {
        try {
          // Get JWT with routing-policies:admin scope for policy management
          const jwt = await getJwt(
            locals.instanceUrl!,
            locals.accessToken!,
            SAPIEN_SCOPES.ROUTING_POLICIES_ADMIN,
            locals.user?.id
          );
          
          const organizationId = getOrganizationId();
          const sapienHost = getSapienHost();
          
          if (organizationId && sapienHost) {
            console.log(`[Sapien Delete] Deleting policy ${natterboxId} from org ${organizationId}`);
            await deletePolicyFromSapien(sapienHost, jwt, organizationId, natterboxId);
            console.log(`[Sapien Delete] Successfully deleted policy ${natterboxId}`);
          }
        } catch (e) {
          console.error('[Sapien Delete] Error:', e);
          // Continue to delete from Salesforce even if Sapien delete fails
        }
      }

      // ========== DELETE FROM SALESFORCE ==========
      await deleteSalesforce(
        locals.instanceUrl!,
        locals.accessToken!,
        `${NAMESPACE}__CallFlow__c`,
        policyId
      );

      return { success: true, message: 'Routing policy deleted successfully' };
    } catch (e) {
      console.error('Error deleting policy:', e);
      return fail(500, { 
        error: e instanceof Error ? e.message : 'Failed to delete policy' 
      });
    }
  },

  /**
   * Toggle policy status (Enable/Disable)
   */
  toggleStatus: async ({ locals, request }) => {
    if (!hasValidCredentials(locals)) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const policyId = formData.get('policyId') as string;
    const newStatus = formData.get('status') as string;

    if (!policyId || !newStatus) {
      return fail(400, { error: 'Policy ID and status are required' });
    }

    try {
      await updateSalesforce(
        locals.instanceUrl!,
        locals.accessToken!,
        `${NAMESPACE}__CallFlow__c`,
        policyId,
        { [`${NAMESPACE}__Status__c`]: newStatus }
      );

      // TODO: Also update in Sapien if configured

      return { success: true, message: `Routing policy ${newStatus === 'Enabled' ? 'enabled' : 'disabled'} successfully` };
    } catch (e) {
      console.error('Error toggling policy status:', e);
      return fail(500, { 
        error: e instanceof Error ? e.message : 'Failed to update policy status' 
      });
    }
  },
};

