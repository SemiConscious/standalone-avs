import type { PageServerLoad, Actions } from './$types';
import { tryCreateContextAndRepositories } from '$lib/adapters';
import type { PhoneNumber } from '$lib/domain';
import { error, fail } from '@sveltejs/kit';

interface CallFlow {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  name: string;
}

// Demo data
const DEMO_PHONE_NUMBER: PhoneNumber = {
  id: 'pn001',
  name: 'Main Office',
  number: '+442071234567',
  formattedNumber: '+44 20 7123 4567',
  country: 'United Kingdom',
  countryCode: '44',
  areaCode: '20',
  type: 'geographic',
  status: 'active',
  capabilities: {
    voice: true,
    sms: true,
    mms: false,
  },
  lastModified: '2026-01-05T10:30:00Z',
  assignedUserId: 'u001',
  assignedUserName: 'John Smith',
  routingPolicyId: 'cf001',
  routingPolicyName: 'Main IVR',
};

const DEMO_CALL_FLOWS: CallFlow[] = [
  { id: 'cf001', name: 'Main IVR' },
  { id: 'cf002', name: 'Sales Queue' },
  { id: 'cf003', name: 'Support Queue' },
  { id: 'cf004', name: 'After Hours' },
];

const DEMO_USERS: UserOption[] = [
  { id: 'u001', name: 'John Smith' },
  { id: 'u002', name: 'Jane Doe' },
  { id: 'u003', name: 'Bob Johnson' },
];

export const load: PageServerLoad = async ({ params, locals }) => {
  const { id } = params;

  const result = tryCreateContextAndRepositories(locals);

  // Not authenticated - show demo data
  if (!result) {
    return {
      phoneNumber: { ...DEMO_PHONE_NUMBER, id },
      callFlows: DEMO_CALL_FLOWS,
      users: DEMO_USERS,
      isDemo: true,
    };
  }

  const { repos, isDemo } = result;

  if (isDemo) {
    return {
      phoneNumber: { ...DEMO_PHONE_NUMBER, id },
      callFlows: DEMO_CALL_FLOWS,
      users: DEMO_USERS,
      isDemo: true,
    };
  }

  try {
    // Fetch phone number
    const phoneNumber = await repos.phoneNumbers.findById(id);
    if (!phoneNumber) {
      throw error(404, 'Phone number not found');
    }

    // Fetch users for dropdown
    let users: UserOption[] = [];
    try {
      const userResult = await repos.users.findAll({ page: 1, pageSize: 500, filters: { enabled: true } });
      users = userResult.items.map(u => ({ id: u.id, name: u.name }));
    } catch (e) {
      console.warn('Failed to fetch users:', e);
    }

    // Fetch routing policies for dropdown
    let callFlows: CallFlow[] = [];
    try {
      const policyResult = await repos.routingPolicies.findAll({ page: 1, pageSize: 200 });
      callFlows = policyResult.items.map(p => ({ id: p.id, name: p.name }));
    } catch (e) {
      console.warn('Failed to fetch routing policies:', e);
    }

    return {
      phoneNumber,
      callFlows,
      users,
      isDemo: false,
    };
  } catch (e) {
    if ((e as { status?: number }).status === 404) throw e;
    console.error('Failed to load phone number:', e);
    return {
      phoneNumber: null,
      callFlows: [],
      users: [],
      isDemo: false,
      error: e instanceof Error ? e.message : 'Failed to load phone number',
    };
  }
};

export const actions: Actions = {
  update: async ({ params, locals, request }) => {
    const { id } = params;

    const result = tryCreateContextAndRepositories(locals);
    if (!result) {
      return fail(401, { error: 'Not authenticated' });
    }

    const { repos, isDemo } = result;
    if (isDemo) {
      return fail(400, { error: 'Not available in demo mode' });
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const callFlowId = formData.get('callFlowId') as string;
    const userId = formData.get('userId') as string;
    const localPresenceEnabled = formData.get('localPresenceEnabled') === 'true';

    if (!name) {
      return fail(400, { error: 'Name is required' });
    }

    try {
      const updateResult = await repos.phoneNumbers.update(id, {
        name,
        routingPolicyId: callFlowId || undefined,
        assignedUserId: userId || undefined,
      });

      if (!updateResult.success) {
        return fail(500, { error: updateResult.error || 'Failed to update phone number' });
      }

      return { success: true };
    } catch (e) {
      console.error('Failed to update phone number:', e);
      return fail(500, { error: e instanceof Error ? e.message : 'Failed to update phone number' });
    }
  },
};
