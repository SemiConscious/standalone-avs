import type { PageServerLoad, Actions } from './$types';
import { hasValidCredentials, querySalesforce, updateSalesforce, deleteSalesforce } from '$lib/server/salesforce';
import { env } from '$env/dynamic/private';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Device } from '../+page.server';

const NAMESPACE = env.SALESFORCE_PACKAGE_NAMESPACE || 'nbavs';

// Extension validation constants
const EXTENSION_MIN = 2000;
const EXTENSION_MAX = 7999;

interface SalesforceDevice {
  Id: string;
  Name: string;
  nbavs__Id__c: number;
  nbavs__Extension__c: string;
  nbavs__Location__c: string;
  nbavs__Description__c: string;
  nbavs__Type__c: string;
  nbavs__Model__c: string;
  nbavs__MAC__c: string;
  nbavs__Enabled__c: boolean;
  nbavs__Registered__c: boolean;
  nbavs__RegistrationExpiry__c: string;
  LastModifiedDate: string;
}

interface SalesforceDeviceMapping {
  Id: string;
  nbavs__User__c: string;
  nbavs__User__r?: { Id: string; Name: string };
}

interface SalesforceUser {
  Id: string;
  Name: string;
}

// Demo data
const DEMO_DEVICE: Device = {
  id: '1',
  apiId: 1001,
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

function formatMacAddress(mac: string | null): string {
  if (!mac) return '';
  const cleaned = mac.replace(/[^a-fA-F0-9]/g, '');
  if (cleaned.length === 12) {
    return cleaned.match(/.{1,2}/g)?.join(':').toUpperCase() || mac;
  }
  return mac;
}

export const load: PageServerLoad = async ({ params, locals }) => {
  const { id } = params;

  // Demo mode
  if (env.PUBLIC_DEMO_MODE === 'true' || env.PUBLIC_DEMO_MODE === '1') {
    return {
      device: { ...DEMO_DEVICE, id },
      users: [
        { Id: 'u001', Name: 'John Smith' },
        { Id: 'u002', Name: 'Jane Doe' },
        { Id: 'u003', Name: 'Bob Johnson' },
      ],
      isDemo: true,
    };
  }

  if (!hasValidCredentials(locals)) {
    return {
      device: null,
      users: [],
      isDemo: false,
      error: 'Not authenticated',
    };
  }

  try {
    // Fetch device
    const deviceSoql = `
      SELECT Id, Name, ${NAMESPACE}__Id__c, ${NAMESPACE}__Extension__c, ${NAMESPACE}__Location__c,
             ${NAMESPACE}__Description__c, ${NAMESPACE}__Type__c, ${NAMESPACE}__Model__c,
             ${NAMESPACE}__MAC__c, ${NAMESPACE}__Enabled__c, ${NAMESPACE}__Registered__c,
             ${NAMESPACE}__RegistrationExpiry__c, LastModifiedDate
      FROM ${NAMESPACE}__Device__c
      WHERE Id = '${id}'
      LIMIT 1
    `;

    const deviceResult = await querySalesforce<SalesforceDevice>(
      locals.instanceUrl!,
      locals.accessToken!,
      deviceSoql
    );

    if (deviceResult.records.length === 0) {
      throw error(404, 'Device not found');
    }

    const sfDevice = deviceResult.records[0];

    // Fetch device mapping (assigned user)
    let assignedUserId: string | undefined;
    let assignedUserName: string | undefined;
    try {
      const mappingSoql = `
        SELECT Id, ${NAMESPACE}__User__c, ${NAMESPACE}__User__r.Id, ${NAMESPACE}__User__r.Name
        FROM ${NAMESPACE}__DeviceMapping__c
        WHERE ${NAMESPACE}__Device__c = '${id}'
        LIMIT 1
      `;
      const mappingResult = await querySalesforce<SalesforceDeviceMapping>(
        locals.instanceUrl!,
        locals.accessToken!,
        mappingSoql
      );
      if (mappingResult.records.length > 0) {
        const mapping = mappingResult.records[0];
        assignedUserId = mapping.nbavs__User__r?.Id;
        assignedUserName = mapping.nbavs__User__r?.Name;
      }
    } catch (e) {
      console.warn('Failed to fetch device mapping:', e);
    }

    // Fetch available users for assignment
    let users: SalesforceUser[] = [];
    try {
      const usersSoql = `
        SELECT Id, Name
        FROM ${NAMESPACE}__User__c
        WHERE ${NAMESPACE}__Enabled__c = true
        ORDER BY Name
        LIMIT 500
      `;
      const usersResult = await querySalesforce<SalesforceUser>(
        locals.instanceUrl!,
        locals.accessToken!,
        usersSoql
      );
      users = usersResult.records;
    } catch (e) {
      console.warn('Failed to fetch users:', e);
    }

    const device: Device = {
      id: sfDevice.Id,
      apiId: sfDevice.nbavs__Id__c || 0,
      extension: sfDevice.nbavs__Extension__c || '',
      location: sfDevice.nbavs__Location__c || '',
      description: sfDevice.nbavs__Description__c || '',
      type: sfDevice.nbavs__Type__c || 'Unknown',
      model: sfDevice.nbavs__Model__c || '',
      macAddress: formatMacAddress(sfDevice.nbavs__MAC__c),
      enabled: sfDevice.nbavs__Enabled__c || false,
      registered: sfDevice.nbavs__Registered__c || false,
      registrationExpiry: sfDevice.nbavs__RegistrationExpiry__c,
      lastModified: sfDevice.LastModifiedDate,
      assignedUserId,
      assignedUserName,
    };

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

    if (!hasValidCredentials(locals)) {
      return fail(401, { error: 'Not authenticated' });
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
        const duplicateCheck = await querySalesforce<{ Id: string }>(
          locals.instanceUrl!,
          locals.accessToken!,
          `SELECT Id FROM ${NAMESPACE}__Device__c WHERE ${NAMESPACE}__Extension__c = '${extension}' AND Id != '${id}' LIMIT 1`
        );
        if (duplicateCheck.records.length > 0) {
          errors.push('Extension is already in use by another device');
        }

        // Also check users
        const userDuplicateCheck = await querySalesforce<{ Id: string }>(
          locals.instanceUrl!,
          locals.accessToken!,
          `SELECT Id FROM ${NAMESPACE}__User__c WHERE ${NAMESPACE}__SipExtension__c = '${extension}' LIMIT 1`
        );
        if (userDuplicateCheck.records.length > 0) {
          errors.push('Extension is already in use by a user');
        }

        // Also check groups
        const groupDuplicateCheck = await querySalesforce<{ Id: string }>(
          locals.instanceUrl!,
          locals.accessToken!,
          `SELECT Id FROM ${NAMESPACE}__Group__c WHERE ${NAMESPACE}__Extension__c = '${extension}' LIMIT 1`
        );
        if (groupDuplicateCheck.records.length > 0) {
          errors.push('Extension is already in use by a group');
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
      // Build update payload
      const updateData: Record<string, unknown> = {
        [`${NAMESPACE}__Extension__c`]: extension,
        [`${NAMESPACE}__Location__c`]: location,
        [`${NAMESPACE}__Description__c`]: description,
        [`${NAMESPACE}__Model__c`]: model,
        [`${NAMESPACE}__MAC__c`]: macAddress,
        [`${NAMESPACE}__Enabled__c`]: enabled,
      };

      // Update Salesforce
      await updateSalesforce(
        locals.instanceUrl!,
        locals.accessToken!,
        `${NAMESPACE}__Device__c`,
        id,
        updateData
      );

      return { success: true };
    } catch (e) {
      console.error('Failed to update device:', e);
      return fail(500, { error: e instanceof Error ? e.message : 'Failed to update device' });
    }
  },

  delete: async ({ params, locals }) => {
    const { id } = params;

    if (!hasValidCredentials(locals)) {
      return fail(401, { error: 'Not authenticated' });
    }

    try {
      await deleteSalesforce(
        locals.instanceUrl!,
        locals.accessToken!,
        `${NAMESPACE}__Device__c`,
        id
      );

      throw redirect(303, '/devices');
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

    if (!hasValidCredentials(locals)) {
      return fail(401, { error: 'Not authenticated' });
    }

    try {
      // Get current enabled state
      const deviceSoql = `SELECT ${NAMESPACE}__Enabled__c FROM ${NAMESPACE}__Device__c WHERE Id = '${id}'`;
      const deviceResult = await querySalesforce<{ nbavs__Enabled__c: boolean }>(
        locals.instanceUrl!,
        locals.accessToken!,
        deviceSoql
      );

      if (deviceResult.records.length === 0) {
        return fail(404, { error: 'Device not found' });
      }

      const currentEnabled = deviceResult.records[0].nbavs__Enabled__c;

      // Toggle
      await updateSalesforce(
        locals.instanceUrl!,
        locals.accessToken!,
        `${NAMESPACE}__Device__c`,
        id,
        { [`${NAMESPACE}__Enabled__c`]: !currentEnabled }
      );

      return { success: true, enabled: !currentEnabled };
    } catch (e) {
      console.error('Failed to toggle device enabled state:', e);
      return fail(500, { error: e instanceof Error ? e.message : 'Failed to update device' });
    }
  },
};
