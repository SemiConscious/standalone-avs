import type { PageServerLoad, Actions } from './$types';
import { tryCreateContextAndRepositories } from '$lib/adapters';
import { fail, redirect } from '@sveltejs/kit';

interface CallFlow {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  name: string;
}

const DEMO_CALL_FLOWS: CallFlow[] = [
  { id: 'cf001', name: 'Main IVR' },
  { id: 'cf002', name: 'Sales Queue' },
  { id: 'cf003', name: 'Support Queue' },
];

const DEMO_USERS: UserOption[] = [
  { id: 'u001', name: 'John Smith' },
  { id: 'u002', name: 'Jane Doe' },
];

export const load: PageServerLoad = async ({ locals }) => {
  const result = tryCreateContextAndRepositories(locals);

  // Not authenticated - show demo data
  if (!result) {
    return {
      callFlows: DEMO_CALL_FLOWS,
      users: DEMO_USERS,
      isDemo: true,
    };
  }

  const { repos, isDemo } = result;

  if (isDemo) {
    return {
      callFlows: DEMO_CALL_FLOWS,
      users: DEMO_USERS,
      isDemo: true,
    };
  }

  try {
    // Fetch routing policies for dropdown
    let callFlows: CallFlow[] = [];
    try {
      const policyResult = await repos.routingPolicies.findAll({ page: 1, pageSize: 200 });
      callFlows = policyResult.items.map(p => ({ id: p.id, name: p.name }));
    } catch (e) {
      console.warn('Failed to fetch routing policies:', e);
    }

    // Fetch users for dropdown
    let users: UserOption[] = [];
    try {
      const userResult = await repos.users.findAll({ page: 1, pageSize: 500, filters: { enabled: true } });
      users = userResult.items.map(u => ({ id: u.id, name: u.name }));
    } catch (e) {
      console.warn('Failed to fetch users:', e);
    }

    return {
      callFlows,
      users,
      isDemo: false,
    };
  } catch (e) {
    console.error('Failed to load form data:', e);
    return {
      callFlows: [],
      users: [],
      isDemo: false,
      error: e instanceof Error ? e.message : 'Failed to load form data',
    };
  }
};

export const actions: Actions = {
  create: async ({ locals, request }) => {
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
    const number = formData.get('number') as string;
    const callFlowId = formData.get('callFlowId') as string;
    const userId = formData.get('userId') as string;

    const errors: string[] = [];

    // Validation
    if (!name) {
      errors.push('Display name is required');
    }

    if (!number) {
      errors.push('Phone number is required');
    }

    // Validate phone number format (basic validation)
    if (number && !/^\+?[\d\s\-()]+$/.test(number)) {
      errors.push('Invalid phone number format');
    }

    // Check for duplicate number
    if (number) {
      try {
        const existing = await repos.phoneNumbers.findByNumber(number);
        if (existing) {
          errors.push('This phone number already exists in the system');
        }
      } catch (e) {
        console.warn('Failed to check for duplicate number:', e);
      }
    }

    if (errors.length > 0) {
      return fail(400, { error: errors.join('. ') });
    }

    try {
      // Clean the number for storage
      const cleanedNumber = number.startsWith('+') ? number : `+${number.replace(/\D/g, '')}`;

      // For now, assign through the assignment method if we have a user or policy
      // Note: Phone numbers in this system are typically provisioned externally
      // This action creates a record but full implementation may need additional API calls

      // Since IPhoneNumberRepository doesn't have a create method, we'll fail gracefully
      return fail(400, { error: 'Phone number provisioning is not available from this interface. Please use the provisioning system.' });
    } catch (e) {
      if ((e as { status?: number }).status === 303) {
        throw e; // Re-throw redirects
      }
      console.error('Failed to create phone number:', e);
      return fail(500, {
        error: e instanceof Error ? e.message : 'Failed to create phone number',
      });
    }
  },
};
