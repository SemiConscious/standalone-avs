import type { PageServerLoad, Actions } from './$types';
import { hasValidCredentials, createSalesforce, querySalesforce } from '$lib/server/salesforce';
import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const NAMESPACE = env.SALESFORCE_PACKAGE_NAMESPACE || 'nbavs';

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
  // Demo mode
  if (env.PUBLIC_DEMO_MODE === 'true' || env.PUBLIC_DEMO_MODE === '1') {
    return {
      callFlows: DEMO_CALL_FLOWS,
      users: DEMO_USERS,
      isDemo: true,
    };
  }

  if (!hasValidCredentials(locals)) {
    return {
      callFlows: [],
      users: [],
      isDemo: false,
      error: 'Not authenticated',
    };
  }

  try {
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
    if (!hasValidCredentials(locals)) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();

    const name = formData.get('name') as string;
    const number = formData.get('number') as string;
    const country = formData.get('country') as string;
    const countryCode = formData.get('countryCode') as string;
    const area = formData.get('area') as string;
    const areaCode = formData.get('areaCode') as string;
    const isDDI = formData.get('isDDI') === 'true';
    const isGeographic = formData.get('isGeographic') === 'true';
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
      const cleanedNumber = number.replace(/\D/g, '');
      try {
        const duplicateCheck = await querySalesforce<{ Id: string }>(
          locals.instanceUrl!,
          locals.accessToken!,
          `SELECT Id FROM ${NAMESPACE}__PhoneNumber__c WHERE ${NAMESPACE}__Number__c LIKE '%${cleanedNumber}%' LIMIT 1`
        );
        if (duplicateCheck.records.length > 0) {
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

      const createData: Record<string, unknown> = {
        Name: name,
        [`${NAMESPACE}__Number__c`]: cleanedNumber,
        [`${NAMESPACE}__Country__c`]: country || null,
        [`${NAMESPACE}__CountryCode__c`]: countryCode || null,
        [`${NAMESPACE}__Area__c`]: area || null,
        [`${NAMESPACE}__AreaCode__c`]: areaCode || null,
        [`${NAMESPACE}__DDI_Number__c`]: isDDI,
        [`${NAMESPACE}__Geographic__c`]: isGeographic,
        [`${NAMESPACE}__CallFlow__c`]: callFlowId || null,
        [`${NAMESPACE}__User__c`]: userId || null,
      };

      const result = await createSalesforce(
        locals.instanceUrl!,
        locals.accessToken!,
        `${NAMESPACE}__PhoneNumber__c`,
        createData
      );

      throw redirect(303, `/phone-numbers/${result.id}`);
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
