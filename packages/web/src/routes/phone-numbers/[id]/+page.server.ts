import type { PageServerLoad, Actions } from './$types';
import { hasValidCredentials, querySalesforce, updateSalesforce } from '$lib/server/salesforce';
import { env } from '$env/dynamic/private';
import { error, fail } from '@sveltejs/kit';

const NAMESPACE = env.SALESFORCE_PACKAGE_NAMESPACE || 'nbavs';

interface SalesforcePhoneNumber {
  Id: string;
  Name: string;
  nbavs__Number__c: string;
  nbavs__Country__c: string;
  nbavs__CountryCode__c: string;
  nbavs__AreaCode__c: string;
  nbavs__Area__c: string;
  nbavs__LocalNumber__c: string;
  nbavs__DDI_Number__c: boolean;
  nbavs__Geographic__c: boolean;
  nbavs__Capability_SMS__c: boolean;
  nbavs__Capability_MMS__c: boolean;
  nbavs__Capability_Voice__c: boolean;
  nbavs__Local_Presence_Enabled__c: boolean;
  LastModifiedDate: string;
  nbavs__CallFlow__c: string;
  nbavs__CallFlow__r?: { Id: string; Name: string };
  nbavs__User__c: string;
  nbavs__User__r?: { Id: string; Name: string };
}

export interface PhoneNumber {
  id: string;
  name: string;
  number: string;
  formattedNumber: string;
  country: string;
  countryCode: string;
  area: string;
  areaCode: string;
  localNumber: string;
  isDDI: boolean;
  isGeographic: boolean;
  smsEnabled: boolean;
  mmsEnabled: boolean;
  voiceEnabled: boolean;
  localPresenceEnabled: boolean;
  lastModified: string;
  userId?: string;
  userName?: string;
  callFlowId?: string;
  callFlowName?: string;
}

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
  area: 'London',
  areaCode: '20',
  localNumber: '71234567',
  isDDI: true,
  isGeographic: true,
  smsEnabled: true,
  mmsEnabled: false,
  voiceEnabled: true,
  localPresenceEnabled: false,
  lastModified: '2026-01-05T10:30:00Z',
  userName: 'John Smith',
  userId: 'u001',
  callFlowName: 'Main IVR',
  callFlowId: 'cf001',
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

function formatPhoneNumber(number: string, countryCode?: string): string {
  if (!number) return '';
  const cleaned = number.replace(/\D/g, '');
  
  // UK formatting
  if (countryCode === '44' || number.startsWith('+44')) {
    const ukNumber = cleaned.startsWith('44') ? cleaned.slice(2) : cleaned;
    if (ukNumber.length === 10) {
      return `+44 ${ukNumber.slice(0, 2)} ${ukNumber.slice(2, 6)} ${ukNumber.slice(6)}`;
    }
    if (ukNumber.length === 11) {
      if (ukNumber.startsWith('7')) {
        return `+44 ${ukNumber.slice(0, 4)} ${ukNumber.slice(4, 7)} ${ukNumber.slice(7)}`;
      }
    }
  }
  
  // US formatting
  if (countryCode === '1' || number.startsWith('+1')) {
    const usNumber = cleaned.startsWith('1') ? cleaned.slice(1) : cleaned;
    if (usNumber.length === 10) {
      return `+1 (${usNumber.slice(0, 3)}) ${usNumber.slice(3, 6)}-${usNumber.slice(6)}`;
    }
  }
  
  return number.startsWith('+') ? number : `+${number}`;
}

export const load: PageServerLoad = async ({ params, locals }) => {
  const { id } = params;

  // Demo mode
  if (env.PUBLIC_DEMO_MODE === 'true' || env.PUBLIC_DEMO_MODE === '1') {
    return {
      phoneNumber: { ...DEMO_PHONE_NUMBER, id },
      callFlows: DEMO_CALL_FLOWS,
      users: DEMO_USERS,
      isDemo: true,
    };
  }

  if (!hasValidCredentials(locals)) {
    return {
      phoneNumber: null,
      callFlows: [],
      users: [],
      isDemo: false,
      error: 'Not authenticated',
    };
  }

  try {
    // Fetch phone number
    const phoneSoql = `
      SELECT Id, Name,
             ${NAMESPACE}__Number__c, ${NAMESPACE}__Country__c, ${NAMESPACE}__CountryCode__c,
             ${NAMESPACE}__AreaCode__c, ${NAMESPACE}__Area__c, ${NAMESPACE}__LocalNumber__c,
             ${NAMESPACE}__DDI_Number__c, ${NAMESPACE}__Geographic__c,
             ${NAMESPACE}__Capability_SMS__c, ${NAMESPACE}__Capability_MMS__c, ${NAMESPACE}__Capability_Voice__c,
             ${NAMESPACE}__Local_Presence_Enabled__c, LastModifiedDate,
             ${NAMESPACE}__CallFlow__c, ${NAMESPACE}__CallFlow__r.Id, ${NAMESPACE}__CallFlow__r.Name,
             ${NAMESPACE}__User__c, ${NAMESPACE}__User__r.Id, ${NAMESPACE}__User__r.Name
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

    // Fetch call flows for dropdown
    let callFlows: CallFlow[] = [];
    try {
      const cfSoql = `SELECT Id, Name FROM ${NAMESPACE}__CallFlow__c ORDER BY Name LIMIT 200`;
      const cfResult = await querySalesforce<{ Id: string; Name: string }>(
        locals.instanceUrl!,
        locals.accessToken!,
        cfSoql
      );
      callFlows = cfResult.records.map(cf => ({ id: cf.Id, name: cf.Name }));
    } catch (e) {
      console.warn('Failed to fetch call flows:', e);
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

    const number = sfPhone.nbavs__Number__c || '';

    const phoneNumber: PhoneNumber = {
      id: sfPhone.Id,
      name: sfPhone.Name || '',
      number: number,
      formattedNumber: formatPhoneNumber(number, sfPhone.nbavs__CountryCode__c),
      country: sfPhone.nbavs__Country__c || '',
      countryCode: sfPhone.nbavs__CountryCode__c || '',
      area: sfPhone.nbavs__Area__c || '',
      areaCode: sfPhone.nbavs__AreaCode__c || '',
      localNumber: sfPhone.nbavs__LocalNumber__c || '',
      isDDI: sfPhone.nbavs__DDI_Number__c || false,
      isGeographic: sfPhone.nbavs__Geographic__c || false,
      smsEnabled: sfPhone.nbavs__Capability_SMS__c || false,
      mmsEnabled: sfPhone.nbavs__Capability_MMS__c || false,
      voiceEnabled: sfPhone.nbavs__Capability_Voice__c || false,
      localPresenceEnabled: sfPhone.nbavs__Local_Presence_Enabled__c || false,
      lastModified: sfPhone.LastModifiedDate,
      userId: sfPhone.nbavs__User__r?.Id,
      userName: sfPhone.nbavs__User__r?.Name,
      callFlowId: sfPhone.nbavs__CallFlow__r?.Id,
      callFlowName: sfPhone.nbavs__CallFlow__r?.Name,
    };

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

    if (!hasValidCredentials(locals)) {
      return fail(401, { error: 'Not authenticated' });
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
      const updateData: Record<string, unknown> = {
        Name: name,
        [`${NAMESPACE}__Local_Presence_Enabled__c`]: localPresenceEnabled,
      };

      // Handle lookup fields - set to null if empty to clear them
      updateData[`${NAMESPACE}__CallFlow__c`] = callFlowId || null;
      updateData[`${NAMESPACE}__User__c`] = userId || null;

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
