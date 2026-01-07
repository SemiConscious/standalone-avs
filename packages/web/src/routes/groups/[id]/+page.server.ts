import type { PageServerLoad, Actions } from './$types';
import { hasValidCredentials, querySalesforce, updateSalesforce, createSalesforce, deleteSalesforce, bulkUpdateSalesforce, getLicenseInfo } from '$lib/server/salesforce';
import { env } from '$env/dynamic/private';
import { error, fail } from '@sveltejs/kit';

const NAMESPACE = env.SALESFORCE_PACKAGE_NAMESPACE || 'nbavs';

// Extension validation constants (from GroupController.cls)
const EXTENSION_MIN = 2000;
const EXTENSION_MAX = 7999;

interface SalesforceGroup {
  Id: string;
  Name: string;
  nbavs__Id__c: number;
  nbavs__Description__c: string;
  nbavs__Type__c: string;
  nbavs__MaxQueueTime__c: number;
  nbavs__WaitingCalls__c: number;
  nbavs__AnsweredCalls__c: number;
  nbavs__Extension__c: string;
  nbavs__PBX__c: boolean;
  nbavs__Manager__c: boolean;
  nbavs__Record__c: boolean;
}

interface GroupMember {
  Id: string;
  nbavs__User__c: string;
  nbavs__User__r: {
    Id: string;
    Name: string;
    nbavs__Username__c: string;
    nbavs__SipExtension__c: string;
    nbavs__Enabled__c: boolean;
    nbavs__PBX__c: boolean;
    nbavs__Manager__c: boolean;
    nbavs__Record__c: boolean;
  };
  nbavs__Priority__c: number;
}

export interface Group {
  id: string;
  sapienId: number;
  name: string;
  description: string;
  type: string;
  maxQueueTime: number;
  waitingCalls: number;
  answeredCalls: number;
  extension: string;
  pbx: boolean;
  manager: boolean;
  record: boolean;
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

export interface LicenseInfo {
  pbx: { enabled: boolean };
  manager: { enabled: boolean };
  record: { enabled: boolean };
}

interface AvailableUser {
  id: string;
  name: string;
  username: string;
  extension: string;
}

// Demo data
const DEMO_GROUP: Group = {
  id: 'g001',
  sapienId: 100,
  name: 'Sales Team',
  description: 'Main sales team handling inbound sales inquiries',
  type: 'RING_ALL',
  maxQueueTime: 300,
  waitingCalls: 3,
  answeredCalls: 145,
  extension: '3001',
  pbx: true,
  manager: true,
  record: false,
  members: [
    { id: 'u001', membershipId: 'gm001', name: 'John Smith', username: 'john.smith@natterbox.com', extension: '2001', enabled: true, priority: 1, pbx: true, manager: true, record: false },
    { id: 'u002', membershipId: 'gm002', name: 'Jane Doe', username: 'jane.doe@natterbox.com', extension: '2002', enabled: true, priority: 2, pbx: true, manager: true, record: false },
    { id: 'u003', membershipId: 'gm003', name: 'Alice Williams', username: 'alice.williams@natterbox.com', extension: '2004', enabled: true, priority: 3, pbx: true, manager: false, record: false },
  ],
};

const DEMO_LICENSE_INFO: LicenseInfo = {
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

  // Demo mode
  if (env.PUBLIC_DEMO_MODE === 'true' || env.PUBLIC_DEMO_MODE === '1') {
    return {
      group: { ...DEMO_GROUP, id },
      availableUsers: DEMO_AVAILABLE_USERS,
      licenseInfo: DEMO_LICENSE_INFO,
      isDemo: true,
    };
  }

  if (!hasValidCredentials(locals)) {
    return {
      group: null,
      availableUsers: [],
      licenseInfo: null,
      isDemo: false,
      error: 'Not authenticated',
    };
  }

  try {
    // Fetch license info
    let licenseInfo: LicenseInfo | null = null;
    try {
      const licInfo = await getLicenseInfo(locals.instanceUrl!, locals.accessToken!);
      licenseInfo = {
        pbx: { enabled: licInfo.pbx.enabled },
        manager: { enabled: licInfo.manager.enabled },
        record: { enabled: licInfo.record.enabled },
      };
    } catch (e) {
      console.warn('Failed to fetch license info:', e);
    }

    // Fetch group
    const groupSoql = `
      SELECT Id, Name, ${NAMESPACE}__Id__c,
             ${NAMESPACE}__Description__c, ${NAMESPACE}__Type__c,
             ${NAMESPACE}__MaxQueueTime__c, ${NAMESPACE}__WaitingCalls__c,
             ${NAMESPACE}__AnsweredCalls__c, ${NAMESPACE}__Extension__c,
             ${NAMESPACE}__PBX__c, ${NAMESPACE}__Manager__c, ${NAMESPACE}__Record__c
      FROM ${NAMESPACE}__Group__c
      WHERE Id = '${id}'
      LIMIT 1
    `;

    const groupResult = await querySalesforce<SalesforceGroup>(
      locals.instanceUrl!,
      locals.accessToken!,
      groupSoql
    );

    if (groupResult.records.length === 0) {
      throw error(404, 'Group not found');
    }

    const sfGroup = groupResult.records[0];

    // Fetch group members
    const memberSoql = `
      SELECT Id, ${NAMESPACE}__User__c, ${NAMESPACE}__Priority__c,
             ${NAMESPACE}__User__r.Id, ${NAMESPACE}__User__r.Name,
             ${NAMESPACE}__User__r.${NAMESPACE}__Username__c,
             ${NAMESPACE}__User__r.${NAMESPACE}__SipExtension__c,
             ${NAMESPACE}__User__r.${NAMESPACE}__Enabled__c,
             ${NAMESPACE}__User__r.${NAMESPACE}__PBX__c,
             ${NAMESPACE}__User__r.${NAMESPACE}__Manager__c,
             ${NAMESPACE}__User__r.${NAMESPACE}__Record__c
      FROM ${NAMESPACE}__GroupMember__c
      WHERE ${NAMESPACE}__Group__c = '${id}'
      ORDER BY ${NAMESPACE}__Priority__c ASC
    `;

    const memberResult = await querySalesforce<GroupMember>(
      locals.instanceUrl!,
      locals.accessToken!,
      memberSoql
    );

    const memberUserIds = memberResult.records.map(m => m.nbavs__User__c);

    // Fetch available users (not in this group)
    let availableUsers: AvailableUser[] = [];
    try {
      const userSoql = `
        SELECT Id, Name, ${NAMESPACE}__Username__c, ${NAMESPACE}__SipExtension__c
        FROM ${NAMESPACE}__User__c
        WHERE ${NAMESPACE}__Enabled__c = true
        ${memberUserIds.length > 0 ? `AND Id NOT IN ('${memberUserIds.join("','")}')` : ''}
        ORDER BY Name
        LIMIT 200
      `;

      const userResult = await querySalesforce<{
        Id: string;
        Name: string;
        nbavs__Username__c: string;
        nbavs__SipExtension__c: string;
      }>(locals.instanceUrl!, locals.accessToken!, userSoql);

      availableUsers = userResult.records.map(u => ({
        id: u.Id,
        name: u.Name,
        username: u.nbavs__Username__c || '',
        extension: u.nbavs__SipExtension__c || '',
      }));
    } catch (e) {
      console.warn('Failed to fetch available users:', e);
    }

    const group: Group = {
      id: sfGroup.Id,
      sapienId: sfGroup.nbavs__Id__c || 0,
      name: sfGroup.Name || '',
      description: sfGroup.nbavs__Description__c || '',
      type: sfGroup.nbavs__Type__c || 'RING_ALL',
      maxQueueTime: sfGroup.nbavs__MaxQueueTime__c || 0,
      waitingCalls: sfGroup.nbavs__WaitingCalls__c || 0,
      answeredCalls: sfGroup.nbavs__AnsweredCalls__c || 0,
      extension: sfGroup.nbavs__Extension__c || '',
      pbx: sfGroup.nbavs__PBX__c || false,
      manager: sfGroup.nbavs__Manager__c || false,
      record: sfGroup.nbavs__Record__c || false,
      members: memberResult.records.map(m => ({
        id: m.nbavs__User__c,
        membershipId: m.Id,
        name: m.nbavs__User__r?.Name || '',
        username: m.nbavs__User__r?.nbavs__Username__c || '',
        extension: m.nbavs__User__r?.nbavs__SipExtension__c || '',
        enabled: m.nbavs__User__r?.nbavs__Enabled__c || false,
        priority: m.nbavs__Priority__c || 0,
        pbx: m.nbavs__User__r?.nbavs__PBX__c || false,
        manager: m.nbavs__User__r?.nbavs__Manager__c || false,
        record: m.nbavs__User__r?.nbavs__Record__c || false,
      })),
    };

    return {
      group,
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

    if (!hasValidCredentials(locals)) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const type = formData.get('type') as string;
    const maxQueueTime = parseInt(formData.get('maxQueueTime') as string) || 0;
    const extension = formData.get('extension') as string;
    const pbx = formData.get('pbx') === 'on';
    const manager = formData.get('manager') === 'on';
    const record = formData.get('record') === 'on';

    const errors: string[] = [];

    if (!name) {
      errors.push('Name is required');
    }

    // Extension validation (matching GroupController.cls)
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
      const currentGroupSoql = `
        SELECT ${NAMESPACE}__PBX__c, ${NAMESPACE}__Manager__c, ${NAMESPACE}__Record__c,
               ${NAMESPACE}__Extension__c
        FROM ${NAMESPACE}__Group__c WHERE Id = '${id}'
      `;
      const currentGroup = await querySalesforce<{
        nbavs__PBX__c: boolean;
        nbavs__Manager__c: boolean;
        nbavs__Record__c: boolean;
        nbavs__Extension__c: string;
      }>(locals.instanceUrl!, locals.accessToken!, currentGroupSoql);

      if (currentGroup.records.length === 0) {
        return fail(404, { error: 'Group not found' });
      }

      const current = currentGroup.records[0];

      // Group purpose rules: Cannot remove a purpose once set
      const purposeErrors: string[] = [];
      if (current.nbavs__PBX__c && !pbx) {
        purposeErrors.push('Cannot remove PBX purpose from group');
      }
      if (current.nbavs__Manager__c && !manager) {
        purposeErrors.push('Cannot remove Manager purpose from group');
      }
      if (current.nbavs__Record__c && !record) {
        purposeErrors.push('Cannot remove Record purpose from group');
      }

      if (purposeErrors.length > 0) {
        return fail(400, { error: purposeErrors.join('. ') });
      }

      // If adding new purpose, check member licenses
      if ((pbx && !current.nbavs__PBX__c) || (manager && !current.nbavs__Manager__c) || (record && !current.nbavs__Record__c)) {
        // Fetch members and their licenses
        const memberSoql = `
          SELECT ${NAMESPACE}__User__r.Name,
                 ${NAMESPACE}__User__r.${NAMESPACE}__PBX__c,
                 ${NAMESPACE}__User__r.${NAMESPACE}__Manager__c,
                 ${NAMESPACE}__User__r.${NAMESPACE}__Record__c
          FROM ${NAMESPACE}__GroupMember__c
          WHERE ${NAMESPACE}__Group__c = '${id}'
        `;
        const members = await querySalesforce<{
          nbavs__User__r: {
            Name: string;
            nbavs__PBX__c: boolean;
            nbavs__Manager__c: boolean;
            nbavs__Record__c: boolean;
          };
        }>(locals.instanceUrl!, locals.accessToken!, memberSoql);

        const memberLicenseErrors: string[] = [];
        for (const m of members.records) {
          if (pbx && !current.nbavs__PBX__c && !m.nbavs__User__r?.nbavs__PBX__c) {
            memberLicenseErrors.push(`User ${m.nbavs__User__r?.Name} does not have PBX license`);
          }
          if (manager && !current.nbavs__Manager__c && !m.nbavs__User__r?.nbavs__Manager__c) {
            memberLicenseErrors.push(`User ${m.nbavs__User__r?.Name} does not have Manager license`);
          }
          if (record && !current.nbavs__Record__c && !m.nbavs__User__r?.nbavs__Record__c) {
            memberLicenseErrors.push(`User ${m.nbavs__User__r?.Name} does not have Record license`);
          }
        }

        if (memberLicenseErrors.length > 0) {
          return fail(400, { error: 'Cannot add group purpose: ' + memberLicenseErrors.join('. ') });
        }
      }

      // Check extension uniqueness if changed
      if (extension && extension !== current.nbavs__Extension__c) {
        const duplicateCheck = await querySalesforce<{ Id: string }>(
          locals.instanceUrl!,
          locals.accessToken!,
          `SELECT Id FROM ${NAMESPACE}__Group__c WHERE ${NAMESPACE}__Extension__c = '${extension}' AND Id != '${id}' LIMIT 1`
        );
        if (duplicateCheck.records.length > 0) {
          return fail(400, { error: 'Extension is already in use by another group' });
        }

        const userDuplicateCheck = await querySalesforce<{ Id: string }>(
          locals.instanceUrl!,
          locals.accessToken!,
          `SELECT Id FROM ${NAMESPACE}__User__c WHERE ${NAMESPACE}__SipExtension__c = '${extension}' LIMIT 1`
        );
        if (userDuplicateCheck.records.length > 0) {
          return fail(400, { error: 'Extension is already in use by a user' });
        }
      }

      await updateSalesforce(
        locals.instanceUrl!,
        locals.accessToken!,
        `${NAMESPACE}__Group__c`,
        id,
        {
          Name: name,
          [`${NAMESPACE}__Description__c`]: description,
          [`${NAMESPACE}__Type__c`]: type,
          [`${NAMESPACE}__MaxQueueTime__c`]: maxQueueTime,
          [`${NAMESPACE}__Extension__c`]: extension || null,
          [`${NAMESPACE}__PBX__c`]: pbx,
          [`${NAMESPACE}__Manager__c`]: manager,
          [`${NAMESPACE}__Record__c`]: record,
        }
      );

      return { success: true };
    } catch (e) {
      console.error('Failed to update group:', e);
      return fail(500, { error: e instanceof Error ? e.message : 'Failed to update group' });
    }
  },

  addMember: async ({ params, locals, request }) => {
    const { id } = params;

    if (!hasValidCredentials(locals)) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const userId = formData.get('userId') as string;
    const priority = parseInt(formData.get('priority') as string) || 0;

    if (!userId) {
      return fail(400, { error: 'User is required' });
    }

    try {
      await createSalesforce(
        locals.instanceUrl!,
        locals.accessToken!,
        `${NAMESPACE}__GroupMember__c`,
        {
          [`${NAMESPACE}__Group__c`]: id,
          [`${NAMESPACE}__User__c`]: userId,
          [`${NAMESPACE}__Priority__c`]: priority,
        }
      );

      return { success: true, action: 'addMember' };
    } catch (e) {
      console.error('Failed to add member:', e);
      return fail(500, { error: e instanceof Error ? e.message : 'Failed to add member' });
    }
  },

  removeMember: async ({ locals, request }) => {
    if (!hasValidCredentials(locals)) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const membershipId = formData.get('membershipId') as string;

    if (!membershipId) {
      return fail(400, { error: 'Membership ID is required' });
    }

    try {
      await deleteSalesforce(
        locals.instanceUrl!,
        locals.accessToken!,
        `${NAMESPACE}__GroupMember__c`,
        membershipId
      );

      return { success: true, action: 'removeMember' };
    } catch (e) {
      console.error('Failed to remove member:', e);
      return fail(500, { error: e instanceof Error ? e.message : 'Failed to remove member' });
    }
  },

  updatePriority: async ({ locals, request }) => {
    if (!hasValidCredentials(locals)) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const membershipId = formData.get('membershipId') as string;
    const priority = parseInt(formData.get('priority') as string);

    if (!membershipId || isNaN(priority)) {
      return fail(400, { error: 'Membership ID and priority are required' });
    }

    try {
      await updateSalesforce(
        locals.instanceUrl!,
        locals.accessToken!,
        `${NAMESPACE}__GroupMember__c`,
        membershipId,
        { [`${NAMESPACE}__Priority__c`]: priority }
      );

      return { success: true, action: 'updatePriority' };
    } catch (e) {
      console.error('Failed to update priority:', e);
      return fail(500, { error: e instanceof Error ? e.message : 'Failed to update priority' });
    }
  },

  bulkUpdatePriorities: async ({ locals, request }) => {
    if (!hasValidCredentials(locals)) {
      return fail(401, { error: 'Not authenticated' });
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

      const records = priorities.map(p => ({
        Id: p.membershipId,
        [`${NAMESPACE}__Priority__c`]: p.priority,
      }));

      await bulkUpdateSalesforce(
        locals.instanceUrl!,
        locals.accessToken!,
        `${NAMESPACE}__GroupMember__c`,
        records
      );

      return { success: true, action: 'bulkUpdatePriorities' };
    } catch (e) {
      console.error('Failed to bulk update priorities:', e);
      return fail(500, { error: e instanceof Error ? e.message : 'Failed to update priorities' });
    }
  },
};

