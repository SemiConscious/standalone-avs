import type { PageServerLoad, Actions } from './$types';
import { hasValidCredentials, querySalesforce, updateSalesforce, createSalesforce, deleteSalesforce } from '$lib/server/salesforce';
import { env } from '$env/dynamic/private';
import { error, fail } from '@sveltejs/kit';

const NAMESPACE = env.SALESFORCE_PACKAGE_NAMESPACE || 'nbavs';

interface SalesforceGroup {
  Id: string;
  Name: string;
  nbavs__Id__c: number;
  nbavs__Description__c: string;
  nbavs__Type__c: string;
  nbavs__MaxQueueTime__c: number;
  nbavs__WaitingCalls__c: number;
  nbavs__AnsweredCalls__c: number;
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
  members: {
    id: string;
    membershipId: string;
    name: string;
    username: string;
    extension: string;
    enabled: boolean;
    priority: number;
  }[];
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
  members: [
    { id: 'u001', membershipId: 'gm001', name: 'John Smith', username: 'john.smith@natterbox.com', extension: '2001', enabled: true, priority: 1 },
    { id: 'u002', membershipId: 'gm002', name: 'Jane Doe', username: 'jane.doe@natterbox.com', extension: '2002', enabled: true, priority: 2 },
    { id: 'u003', membershipId: 'gm003', name: 'Alice Williams', username: 'alice.williams@natterbox.com', extension: '2004', enabled: true, priority: 3 },
  ],
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
      isDemo: true,
    };
  }

  if (!hasValidCredentials(locals)) {
    return {
      group: null,
      availableUsers: [],
      isDemo: false,
      error: 'Not authenticated',
    };
  }

  try {
    // Fetch group
    const groupSoql = `
      SELECT Id, Name, ${NAMESPACE}__Id__c,
             ${NAMESPACE}__Description__c, ${NAMESPACE}__Type__c,
             ${NAMESPACE}__MaxQueueTime__c, ${NAMESPACE}__WaitingCalls__c,
             ${NAMESPACE}__AnsweredCalls__c
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
             ${NAMESPACE}__User__r.${NAMESPACE}__Enabled__c
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
      members: memberResult.records.map(m => ({
        id: m.nbavs__User__c,
        membershipId: m.Id,
        name: m.nbavs__User__r?.Name || '',
        username: m.nbavs__User__r?.nbavs__Username__c || '',
        extension: m.nbavs__User__r?.nbavs__SipExtension__c || '',
        enabled: m.nbavs__User__r?.nbavs__Enabled__c || false,
        priority: m.nbavs__Priority__c || 0,
      })),
    };

    return {
      group,
      availableUsers,
      isDemo: false,
    };
  } catch (e) {
    if ((e as { status?: number }).status === 404) throw e;
    console.error('Failed to load group:', e);
    return {
      group: null,
      availableUsers: [],
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

    if (!name) {
      return fail(400, { error: 'Name is required' });
    }

    try {
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
};

