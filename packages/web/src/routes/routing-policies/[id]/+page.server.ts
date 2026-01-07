import type { PageServerLoad } from './$types';
import { hasValidCredentials, querySalesforce } from '$lib/server/salesforce';
import { getSapienJwt, canGetSapienJwt } from '$lib/server/sapien';
import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';

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

export const load: PageServerLoad = async ({ params, locals }) => {
  const policyId = params.id;

  if (!hasValidCredentials(locals)) {
    // Return demo data for unauthenticated users
    return getDemoData(policyId);
  }

  try {
    // Fetch the policy
    const policyQuery = `
      SELECT Id, Name, ${NAMESPACE}__Description__c, ${NAMESPACE}__Body__c, 
             ${NAMESPACE}__Color__c, ${NAMESPACE}__Grid__c, ${NAMESPACE}__IsActive__c,
             CreatedDate, LastModifiedDate
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
        body = JSON.parse(bodyField);
      }
    } catch (e) {
      console.warn('Failed to parse policy body:', e);
    }

    const policy: PolicyData = {
      id: rawPolicy.Id,
      name: rawPolicy.Name,
      description: rawPolicy[`${NAMESPACE}__Description__c`] || '',
      body,
      color: rawPolicy[`${NAMESPACE}__Color__c`],
      grid: rawPolicy[`${NAMESPACE}__Grid__c`],
      isActive: rawPolicy[`${NAMESPACE}__IsActive__c`] || false,
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
    const query = `
      SELECT Id, Name, ${NAMESPACE}__Email__c
      FROM ${NAMESPACE}__User__c
      ORDER BY Name
      LIMIT 1000
    `;
    const result = await querySalesforce(locals.instanceUrl!, locals.accessToken!, query);
    return (result.records || []).map((r: Record<string, unknown>) => ({
      id: r.Id as string,
      name: r.Name as string,
      email: r[`${NAMESPACE}__Email__c`] as string | undefined,
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
    const query = `
      SELECT Id, Name, ${NAMESPACE}__URL__c
      FROM ${NAMESPACE}__Sound__c
      ORDER BY Name
      LIMIT 1000
    `;
    const result = await querySalesforce(locals.instanceUrl!, locals.accessToken!, query);
    return (result.records || []).map((r: Record<string, unknown>) => ({
      id: r.Id as string,
      name: r.Name as string,
      url: r[`${NAMESPACE}__URL__c`] as string | undefined,
    }));
  } catch (e) {
    console.warn('Failed to fetch sounds:', e);
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

