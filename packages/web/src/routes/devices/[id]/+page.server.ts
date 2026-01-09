import type { PageServerLoad, Actions } from './$types';
import { tryCreateContextAndRepositories } from '$lib/adapters';
import type { Device } from '$lib/domain';
import { error, fail, redirect } from '@sveltejs/kit';

// Extension validation constants
const EXTENSION_MIN = 2000;
const EXTENSION_MAX = 7999;

// Demo data
const DEMO_DEVICE: Device = {
  id: '1',
  platformId: 1001,
  extension: '1001',
  location: 'London Office',
  description: 'Front Desk Phone',
  type: 'SIP',
  model: 'Polycom VVX 450',
  macAddress: '00:11:22:33:44:55',
  enabled: true,
  registered: true,
  registrationExpiry: '2026-01-06T10:30:00Z',
  lastModified: '2026-01-05T09:00:00Z',
  assignedUserName: 'John Smith',
  assignedUserId: 'u001',
};

const DEMO_USERS = [
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
      device: { ...DEMO_DEVICE, id },
      users: DEMO_USERS,
      isDemo: true,
    };
  }

  const { repos, isDemo } = result;

  if (isDemo) {
    return {
      device: { ...DEMO_DEVICE, id },
      users: DEMO_USERS,
      isDemo: true,
    };
  }

  try {
    // Fetch device
    const device = await repos.devices.findById(id);
    if (!device) {
      throw error(404, 'Device not found');
    }

    // Fetch device mappings
    const mappings = await repos.devices.getMappings(id);
    if (mappings.length > 0) {
      device.assignedUserId = mappings[0].userId;
      device.assignedUserName = mappings[0].userName;
    }

    // Fetch available users for assignment
    const userResult = await repos.users.findAll({ page: 1, pageSize: 500, filters: { enabled: true } });
    const users = userResult.items.map(u => ({ id: u.id, name: u.name }));

    return {
      device,
      users,
      isDemo: false,
    };
  } catch (e) {
    if ((e as { status?: number }).status === 404) throw e;
    console.error('Failed to load device:', e);
    return {
      device: null,
      users: [],
      isDemo: false,
      error: e instanceof Error ? e.message : 'Failed to load device',
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

    // Extract form fields
    const extension = formData.get('extension') as string;
    const location = formData.get('location') as string;
    const description = formData.get('description') as string;
    const model = formData.get('model') as string;
    const macAddress = formData.get('macAddress') as string;
    const enabled = formData.get('enabled') === 'true';

    const errors: string[] = [];

    // Extension validation
    if (extension) {
      const extNum = parseInt(extension);
      if (isNaN(extNum) || extNum < EXTENSION_MIN || extNum > EXTENSION_MAX) {
        errors.push(`Extension must be between ${EXTENSION_MIN} and ${EXTENSION_MAX}`);
      }

      // Check for duplicate extension
      try {
        const isAvailable = await repos.devices.isExtensionAvailable(extension, id);
        if (!isAvailable) {
          errors.push('Extension is already in use');
        }
      } catch (e) {
        console.warn('Failed to check extension uniqueness:', e);
      }
    }

    // MAC address validation (if provided)
    if (macAddress) {
      const cleanedMac = macAddress.replace(/[^a-fA-F0-9]/g, '');
      if (cleanedMac.length !== 12) {
        errors.push('Invalid MAC address format');
      }
    }

    if (errors.length > 0) {
      return fail(400, { error: errors.join('. ') });
    }

    try {
      const updateResult = await repos.devices.update(id, {
        extension,
        location,
        description,
        model,
        macAddress,
        enabled,
      });

      if (!updateResult.success) {
        return fail(500, { error: updateResult.error || 'Failed to update device' });
      }

      return { success: true };
    } catch (e) {
      console.error('Failed to update device:', e);
      return fail(500, { error: e instanceof Error ? e.message : 'Failed to update device' });
    }
  },

  delete: async ({ params, locals }) => {
    const { id } = params;

    const result = tryCreateContextAndRepositories(locals);
    if (!result) {
      return fail(401, { error: 'Not authenticated' });
    }

    const { repos, isDemo } = result;
    if (isDemo) {
      return fail(400, { error: 'Not available in demo mode' });
    }

    try {
      const deleteResult = await repos.devices.delete(id);

      if (!deleteResult.success) {
        return fail(500, { error: deleteResult.error || 'Failed to delete device' });
      }

      redirect(303, '/devices');
    } catch (e) {
      if ((e as { status?: number }).status === 303) {
        throw e; // Re-throw redirects
      }
      console.error('Failed to delete device:', e);
      return fail(500, { error: e instanceof Error ? e.message : 'Failed to delete device' });
    }
  },

  toggleEnabled: async ({ params, locals }) => {
    const { id } = params;

    const result = tryCreateContextAndRepositories(locals);
    if (!result) {
      return fail(401, { error: 'Not authenticated' });
    }

    const { repos, isDemo } = result;
    if (isDemo) {
      return fail(400, { error: 'Not available in demo mode' });
    }

    try {
      const toggleResult = await repos.devices.toggleEnabled(id);

      if (!toggleResult.success) {
        return fail(500, { error: toggleResult.error || 'Failed to toggle device enabled state' });
      }

      return { success: true, enabled: toggleResult.data?.enabled };
    } catch (e) {
      console.error('Failed to toggle device enabled state:', e);
      return fail(500, { error: e instanceof Error ? e.message : 'Failed to update device' });
    }
  },
};
