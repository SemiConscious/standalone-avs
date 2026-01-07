import type { PageServerLoad, Actions } from './$types';
import { hasValidCredentials, querySalesforce, updateSalesforce } from '$lib/server/salesforce';
import { env } from '$env/dynamic/private';
import { error, fail } from '@sveltejs/kit';

const NAMESPACE = env.SALESFORCE_PACKAGE_NAMESPACE || 'nbavs';

interface SalesforcePhoneNumber {
  Id: string;
  Name: string;
  nbavs__Id__c: number;
  nbavs__Number__c: string;
  nbavs__DisplayNumber__c: string;
  nbavs__Description__c: string;
  nbavs__CountryCode__c: string;
  nbavs__Type__c: string;
  nbavs__Status__c: string;
  nbavs__Policy__c: string;
  nbavs__Policy__r?: {
    Id: string;
    Name: string;
  };
  nbavs__User__c: string;
  nbavs__User__r?: {
    Id: string;
    Name: string;
  };
  nbavs__Group__c: string;
  nbavs__Group__r?: {
    Id: string;
    Name: string;
  };
  nbavs__CallerIdPresentation__c: string;
  nbavs__EmergencyAddress__c: string;
}

export interface PhoneNumber {
  id: string;
  sapienId: number;
  name: string;
  number: string;
  displayNumber: string;
  description: string;
  countryCode: string;
  type: string;
  status: string;
  policy?: { id: string; name: string };
  user?: { id: string; name: string };
  group?: { id: string; name: string };
  callerIdPresentation: string;
  emergencyAddress: string;
}

interface Policy {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  name: string;
}

interface GroupOption {
  id: string;
  name: string;
}

// Demo data
const DEMO_PHONE_NUMBER: PhoneNumber = {
  id: 'pn001',
  sapienId: 100,
  name: 'Main Office',
  number: '+442071234567',
  displayNumber: '+44 20 7123 4567',
  description: 'Main office reception number',
  countryCode: 'GB',
  type: 'DDI',
  status: 'Active',
  policy: { id: 'p001', name: 'Main IVR' },
  callerIdPresentation: 'Number',
  emergencyAddress: '123 Main Street, London, EC1A 1BB',
};

const DEMO_POLICIES: Policy[] = [
  { id: 'p001', name: 'Main IVR' },
  { id: 'p002', name: 'Sales Queue' },
  { id: 'p003', name: 'Support Queue' },
  { id: 'p004', name: 'After Hours' },
];

const DEMO_USERS: UserOption[] = [
  { id: 'u001', name: 'John Smith' },
  { id: 'u002', name: 'Jane Doe' },
  { id: 'u003', name: 'Bob Johnson' },
];

const DEMO_GROUPS: GroupOption[] = [
  { id: 'g001', name: 'Sales Team' },
  { id: 'g002', name: 'Support Team' },
  { id: 'g003', name: 'UK Support' },
];

export const load: PageServerLoad = async ({ params, locals }) => {
  const { id } = params;

  // Demo mode
  if (env.PUBLIC_DEMO_MODE === 'true' || env.PUBLIC_DEMO_MODE === '1') {
    return {
      phoneNumber: { ...DEMO_PHONE_NUMBER, id },
      policies: DEMO_POLICIES,
      users: DEMO_USERS,
      groups: DEMO_GROUPS,
      isDemo: true,
    };
  }

  if (!hasValidCredentials(locals)) {
    return {
      phoneNumber: null,
      policies: [],
      users: [],
      groups: [],
      isDemo: false,
      error: 'Not authenticated',
    };
  }

  try {
    // Fetch phone number
    const phoneSoql = `
      SELECT Id, Name, ${NAMESPACE}__Id__c,
             ${NAMESPACE}__Number__c, ${NAMESPACE}__DisplayNumber__c,
             ${NAMESPACE}__Description__c, ${NAMESPACE}__CountryCode__c,
             ${NAMESPACE}__Type__c, ${NAMESPACE}__Status__c,
             ${NAMESPACE}__Policy__c, ${NAMESPACE}__Policy__r.Id, ${NAMESPACE}__Policy__r.Name,
             ${NAMESPACE}__User__c, ${NAMESPACE}__User__r.Id, ${NAMESPACE}__User__r.Name,
             ${NAMESPACE}__Group__c, ${NAMESPACE}__Group__r.Id, ${NAMESPACE}__Group__r.Name,
             ${NAMESPACE}__CallerIdPresentation__c, ${NAMESPACE}__EmergencyAddress__c
      FROM ${NAMESPACE}__PhoneNumber__c
      WHERE Id = '${id}'
      LIMIT 1
    `;

    const phoneResult = await querySalesforce<SalesforcePhoneNumber>(
      locals.instanceUrl!,
      locals.accessToken!,
      phoneSoql
    );

    if (phoneResult.records.length === 0) {
      throw error(404, 'Phone number not found');
    }

    const sfPhone = phoneResult.records[0];

    // Fetch policies for dropdown
    let policies: Policy[] = [];
    try {
      const policySoql = `SELECT Id, Name FROM ${NAMESPACE}__CallFlow__c ORDER BY Name LIMIT 200`;
      const policyResult = await querySalesforce<{ Id: string; Name: string }>(
        locals.instanceUrl!,
        locals.accessToken!,
        policySoql
      );
      policies = policyResult.records.map(p => ({ id: p.Id, name: p.Name }));
    } catch (e) {
      console.warn('Failed to fetch policies:', e);
    }

    // Fetch users for dropdown
    let users: UserOption[] = [];
    try {
      const userSoql = `SELECT Id, Name FROM ${NAMESPACE}__User__c WHERE ${NAMESPACE}__Enabled__c = true ORDER BY Name LIMIT 500`;
      const userResult = await querySalesforce<{ Id: string; Name: string }>(
        locals.instanceUrl!,
        locals.accessToken!,
        userSoql
      );
      users = userResult.records.map(u => ({ id: u.Id, name: u.Name }));
    } catch (e) {
      console.warn('Failed to fetch users:', e);
    }

    // Fetch groups for dropdown
    let groups: GroupOption[] = [];
    try {
      const groupSoql = `SELECT Id, Name FROM ${NAMESPACE}__Group__c ORDER BY Name LIMIT 200`;
      const groupResult = await querySalesforce<{ Id: string; Name: string }>(
        locals.instanceUrl!,
        locals.accessToken!,
        groupSoql
      );
      groups = groupResult.records.map(g => ({ id: g.Id, name: g.Name }));
    } catch (e) {
      console.warn('Failed to fetch groups:', e);
    }

    const phoneNumber: PhoneNumber = {
      id: sfPhone.Id,
      sapienId: sfPhone.nbavs__Id__c || 0,
      name: sfPhone.Name || '',
      number: sfPhone.nbavs__Number__c || '',
      displayNumber: sfPhone.nbavs__DisplayNumber__c || sfPhone.nbavs__Number__c || '',
      description: sfPhone.nbavs__Description__c || '',
      countryCode: sfPhone.nbavs__CountryCode__c || '',
      type: sfPhone.nbavs__Type__c || 'DDI',
      status: sfPhone.nbavs__Status__c || 'Active',
      policy: sfPhone.nbavs__Policy__r 
        ? { id: sfPhone.nbavs__Policy__r.Id, name: sfPhone.nbavs__Policy__r.Name }
        : undefined,
      user: sfPhone.nbavs__User__r 
        ? { id: sfPhone.nbavs__User__r.Id, name: sfPhone.nbavs__User__r.Name }
        : undefined,
      group: sfPhone.nbavs__Group__r 
        ? { id: sfPhone.nbavs__Group__r.Id, name: sfPhone.nbavs__Group__r.Name }
        : undefined,
      callerIdPresentation: sfPhone.nbavs__CallerIdPresentation__c || 'Number',
      emergencyAddress: sfPhone.nbavs__EmergencyAddress__c || '',
    };

    return {
      phoneNumber,
      policies,
      users,
      groups,
      isDemo: false,
    };
  } catch (e) {
    if ((e as { status?: number }).status === 404) throw e;
    console.error('Failed to load phone number:', e);
    return {
      phoneNumber: null,
      policies: [],
      users: [],
      groups: [],
      isDemo: false,
      error: e instanceof Error ? e.message : 'Failed to load phone number',
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
    const displayNumber = formData.get('displayNumber') as string;
    const policyId = formData.get('policyId') as string;
    const userId = formData.get('userId') as string;
    const groupId = formData.get('groupId') as string;
    const callerIdPresentation = formData.get('callerIdPresentation') as string;
    const emergencyAddress = formData.get('emergencyAddress') as string;

    if (!name) {
      return fail(400, { error: 'Name is required' });
    }

    try {
      const updateData: Record<string, unknown> = {
        Name: name,
        [`${NAMESPACE}__Description__c`]: description,
        [`${NAMESPACE}__DisplayNumber__c`]: displayNumber,
        [`${NAMESPACE}__CallerIdPresentation__c`]: callerIdPresentation,
        [`${NAMESPACE}__EmergencyAddress__c`]: emergencyAddress,
      };

      // Only set lookup fields if they have values
      if (policyId) {
        updateData[`${NAMESPACE}__Policy__c`] = policyId;
      }
      if (userId) {
        updateData[`${NAMESPACE}__User__c`] = userId;
      }
      if (groupId) {
        updateData[`${NAMESPACE}__Group__c`] = groupId;
      }

      await updateSalesforce(
        locals.instanceUrl!,
        locals.accessToken!,
        `${NAMESPACE}__PhoneNumber__c`,
        id,
        updateData
      );

      return { success: true };
    } catch (e) {
      console.error('Failed to update phone number:', e);
      return fail(500, { error: e instanceof Error ? e.message : 'Failed to update phone number' });
    }
  },
};

