import type { PageServerLoad, Actions } from './$types';
import { tryCreateContextAndRepositories, createAdapterContext, getRepositories } from '$lib/adapters';
import type { Group, GroupMember } from '$lib/domain';
import type { GroupLicenseInfo } from '$lib/repositories';
import { error, fail } from '@sveltejs/kit';

// Extension validation constants (from GroupController.cls)
const EXTENSION_MIN = 2000;
const EXTENSION_MAX = 7999;

// Extended group type with members for this page
interface GroupWithMembers extends Group {
  members: {
    id: string;
    membershipId: string;
    name: string;
    username: string;
    extension: string;
    enabled: boolean;
    priority: number;
    pbx: boolean;
    manager: boolean;
    record: boolean;
  }[];
}

interface AvailableUser {
  id: string;
  name: string;
  username: string;
  extension: string;
}

// Demo data
const DEMO_GROUP: GroupWithMembers = {
  id: 'g001',
  platformId: 100,
  name: 'Sales Team',
  description: 'Main sales team handling inbound sales inquiries',
  email: '',
  extension: '3001',
  groupPickup: '',
  pbx: true,
  manager: true,
  record: false,
  lastModified: new Date().toISOString(),
  memberCount: 3,
  members: [
    { id: 'u001', membershipId: 'gm001', name: 'John Smith', username: 'john.smith@natterbox.com', extension: '2001', enabled: true, priority: 1, pbx: true, manager: true, record: false },
    { id: 'u002', membershipId: 'gm002', name: 'Jane Doe', username: 'jane.doe@natterbox.com', extension: '2002', enabled: true, priority: 2, pbx: true, manager: true, record: false },
    { id: 'u003', membershipId: 'gm003', name: 'Alice Williams', username: 'alice.williams@natterbox.com', extension: '2004', enabled: true, priority: 3, pbx: true, manager: false, record: false },
  ],
};

const DEMO_LICENSE_INFO: GroupLicenseInfo = {
  pbx: { enabled: true },
  manager: { enabled: true },
  record: { enabled: true },
};

const DEMO_AVAILABLE_USERS: AvailableUser[] = [
  { id: 'u004', name: 'Bob Johnson', username: 'bob.johnson@natterbox.com', extension: '2003' },
  { id: 'u005', name: 'Charlie Brown', username: 'charlie.brown@natterbox.com', extension: '2005' },
  { id: 'u006', name: 'Diana Prince', username: 'diana.prince@natterbox.com', extension: '2006' },
];

export const load: PageServerLoad = async ({ params, locals }) => {
  const { id } = params;

  const result = tryCreateContextAndRepositories(locals);

  // Not authenticated or demo mode
  if (!result) {
    return {
      group: { ...DEMO_GROUP, id },
      availableUsers: DEMO_AVAILABLE_USERS,
      licenseInfo: DEMO_LICENSE_INFO,
      isDemo: true,
    };
  }

  const { repos, isDemo } = result;

  if (isDemo) {
    return {
      group: { ...DEMO_GROUP, id },
      availableUsers: DEMO_AVAILABLE_USERS,
      licenseInfo: DEMO_LICENSE_INFO,
      isDemo: true,
    };
  }

  try {
    // Fetch license info
    let licenseInfo: GroupLicenseInfo | null = null;
    try {
      licenseInfo = await repos.license.getGroupLicenseInfo();
    } catch (e) {
      console.warn('Failed to fetch license info:', e);
    }

    // Fetch group
    const group = await repos.groups.findById(id);
    if (!group) {
      throw error(404, 'Group not found');
    }

    // Fetch group members
    const members = await repos.groups.getMembers(id);

    // Fetch available users (not in this group)
    let availableUsers: AvailableUser[] = [];
    try {
      availableUsers = await repos.groups.getAvailableUsersForGroup(id, { limit: 200 });
    } catch (e) {
      console.warn('Failed to fetch available users:', e);
    }

    // Build extended group with members
    const groupWithMembers: GroupWithMembers = {
      ...group,
      members: members.map(m => ({
        id: m.userId,
        membershipId: m.id,
        name: m.userName,
        username: '', // Not always available from group member
        extension: '', // Not always available from group member
        enabled: true, // Default
        priority: m.ringOrder,
        pbx: false,
        manager: false,
        record: false,
      })),
    };

    return {
      group: groupWithMembers,
      availableUsers,
      licenseInfo,
      isDemo: false,
    };
  } catch (e) {
    if ((e as { status?: number }).status === 404) throw e;
    console.error('Failed to load group:', e);
    return {
      group: null,
      availableUsers: [],
      licenseInfo: null,
      isDemo: false,
      error: e instanceof Error ? e.message : 'Failed to load group',
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
    const description = formData.get('description') as string;
    const extension = formData.get('extension') as string;
    const pbx = formData.get('pbx') === 'on';
    const manager = formData.get('manager') === 'on';
    const record = formData.get('record') === 'on';

    const errors: string[] = [];

    if (!name) {
      errors.push('Name is required');
    }

    // Extension validation
    if (extension) {
      const extNum = parseInt(extension);
      if (isNaN(extNum) || extNum < EXTENSION_MIN || extNum > EXTENSION_MAX) {
        errors.push(`Extension must be between ${EXTENSION_MIN} and ${EXTENSION_MAX}`);
      }
    }

    if (errors.length > 0) {
      return fail(400, { error: errors.join('. ') });
    }

    try {
      // Fetch current group to check purpose rules
      const currentGroup = await repos.groups.findById(id);
      if (!currentGroup) {
        return fail(404, { error: 'Group not found' });
      }

      // Group purpose rules: Cannot remove a purpose once set
      const purposeErrors: string[] = [];
      if (currentGroup.pbx && !pbx) {
        purposeErrors.push('Cannot remove PBX purpose from group');
      }
      if (currentGroup.manager && !manager) {
        purposeErrors.push('Cannot remove Manager purpose from group');
      }
      if (currentGroup.record && !record) {
        purposeErrors.push('Cannot remove Record purpose from group');
      }

      if (purposeErrors.length > 0) {
        return fail(400, { error: purposeErrors.join('. ') });
      }

      // Check extension uniqueness if changed
      if (extension && extension !== currentGroup.extension) {
        const isAvailable = await repos.groups.isExtensionAvailable(extension, id);
        if (!isAvailable) {
          return fail(400, { error: 'Extension is already in use' });
        }
        // Also check users
        const userExtAvailable = await repos.users.isExtensionAvailable(extension);
        if (!userExtAvailable) {
          return fail(400, { error: 'Extension is already in use by a user' });
        }
      }

      const updateResult = await repos.groups.update(id, {
        name,
        description,
        extension: extension || undefined,
        pbx,
        manager,
        record,
      });

      if (!updateResult.success) {
        return fail(500, { error: updateResult.error || 'Failed to update group' });
      }

      return { success: true };
    } catch (e) {
      console.error('Failed to update group:', e);
      return fail(500, { error: e instanceof Error ? e.message : 'Failed to update group' });
    }
  },

  addMember: async ({ params, locals, request }) => {
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
    const userId = formData.get('userId') as string;
    const priority = parseInt(formData.get('priority') as string) || 0;

    if (!userId) {
      return fail(400, { error: 'User is required' });
    }

    try {
      const addResult = await repos.groups.addMember({
        groupId: id,
        userId,
        ringOrder: priority,
      });

      if (!addResult.success) {
        return fail(500, { error: addResult.error || 'Failed to add member' });
      }

      return { success: true, action: 'addMember' };
    } catch (e) {
      console.error('Failed to add member:', e);
      return fail(500, { error: e instanceof Error ? e.message : 'Failed to add member' });
    }
  },

  removeMember: async ({ locals, request }) => {
    const result = tryCreateContextAndRepositories(locals);
    if (!result) {
      return fail(401, { error: 'Not authenticated' });
    }

    const { repos, isDemo } = result;
    if (isDemo) {
      return fail(400, { error: 'Not available in demo mode' });
    }

    const formData = await request.formData();
    const membershipId = formData.get('membershipId') as string;

    if (!membershipId) {
      return fail(400, { error: 'Membership ID is required' });
    }

    try {
      const removeResult = await repos.groups.removeMemberById(membershipId);

      if (!removeResult.success) {
        return fail(500, { error: removeResult.error || 'Failed to remove member' });
      }

      return { success: true, action: 'removeMember' };
    } catch (e) {
      console.error('Failed to remove member:', e);
      return fail(500, { error: e instanceof Error ? e.message : 'Failed to remove member' });
    }
  },

  updatePriority: async ({ locals, request }) => {
    const result = tryCreateContextAndRepositories(locals);
    if (!result) {
      return fail(401, { error: 'Not authenticated' });
    }

    const { repos, isDemo } = result;
    if (isDemo) {
      return fail(400, { error: 'Not available in demo mode' });
    }

    const formData = await request.formData();
    const membershipId = formData.get('membershipId') as string;
    const priority = parseInt(formData.get('priority') as string);

    if (!membershipId || isNaN(priority)) {
      return fail(400, { error: 'Membership ID and priority are required' });
    }

    try {
      const updateResult = await repos.groups.bulkUpdateMemberPriorities([
        { membershipId, priority },
      ]);

      if (!updateResult.success) {
        return fail(500, { error: updateResult.error || 'Failed to update priority' });
      }

      return { success: true, action: 'updatePriority' };
    } catch (e) {
      console.error('Failed to update priority:', e);
      return fail(500, { error: e instanceof Error ? e.message : 'Failed to update priority' });
    }
  },

  bulkUpdatePriorities: async ({ locals, request }) => {
    const result = tryCreateContextAndRepositories(locals);
    if (!result) {
      return fail(401, { error: 'Not authenticated' });
    }

    const { repos, isDemo } = result;
    if (isDemo) {
      return fail(400, { error: 'Not available in demo mode' });
    }

    const formData = await request.formData();
    const prioritiesJson = formData.get('priorities') as string;

    if (!prioritiesJson) {
      return fail(400, { error: 'Priorities data is required' });
    }

    try {
      const priorities = JSON.parse(prioritiesJson) as { membershipId: string; priority: number }[];
      
      if (priorities.length === 0) {
        return { success: true, action: 'bulkUpdatePriorities' };
      }

      const updateResult = await repos.groups.bulkUpdateMemberPriorities(priorities);

      if (!updateResult.success) {
        return fail(500, { error: updateResult.error || 'Failed to update priorities' });
      }

      return { success: true, action: 'bulkUpdatePriorities' };
    } catch (e) {
      console.error('Failed to bulk update priorities:', e);
      return fail(500, { error: e instanceof Error ? e.message : 'Failed to update priorities' });
    }
  },
};
