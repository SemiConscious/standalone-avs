import type { PageServerLoad } from './$types';
import { tryCreateContextAndRepositories } from '$lib/adapters';
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

export const load: PageServerLoad = async ({ params, locals }) => {
  const policyId = params.id;

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
    
    if (!policy) {
      throw error(404, 'Policy not found');
    }

    // Parse the policy body JSON if stored as string
    let body: PolicyBody = { nodes: [], edges: [] };
    if (policy.body) {
      try {
        body = typeof policy.body === 'string' ? JSON.parse(policy.body) : policy.body as unknown as PolicyBody;
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
