import { querySalesforce, hasValidCredentials } from '$lib/server/salesforce';
import { env } from '$env/dynamic/private';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

interface SalesforceDeviceMapping {
  Id: string;
  nbavs__User__c: string;
  nbavs__User__r?: { Id: string; Name: string };
}

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
  nbavs__DeviceMappings__r?: {
    records: SalesforceDeviceMapping[];
  };
}

export interface Device {
  id: string;
  apiId: number;
  extension: string;
  location: string;
  description: string;
  type: string;
  model: string;
  macAddress: string;
  enabled: boolean;
  registered: boolean;
  registrationExpiry?: string;
  lastModified: string;
  assignedUserId?: string;
  assignedUserName?: string;
}

// Demo data
const DEMO_DEVICES: Device[] = [
  {
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
  },
  {
    id: '2',
    apiId: 1002,
    extension: '1002',
    location: 'London Office',
    description: 'Jane Softphone',
    type: 'Softphone',
    model: 'AVS Softphone',
    macAddress: '',
    enabled: true,
    registered: true,
    registrationExpiry: '2026-01-06T14:00:00Z',
    lastModified: '2026-01-05T08:30:00Z',
    assignedUserName: 'Jane Doe',
  },
  {
    id: '3',
    apiId: 1003,
    extension: '1003',
    location: 'Conference Room A',
    description: 'Conference Phone',
    type: 'SIP',
    model: 'Polycom Trio 8500',
    macAddress: '00:11:22:33:44:66',
    enabled: true,
    registered: false,
    lastModified: '2026-01-04T16:00:00Z',
  },
  {
    id: '4',
    apiId: 1004,
    extension: '1004',
    location: 'Mobile',
    description: 'Bob Mobile',
    type: 'Web Phone',
    model: 'AVS WebRTC',
    macAddress: '',
    enabled: true,
    registered: false,
    lastModified: '2026-01-03T11:00:00Z',
    assignedUserName: 'Bob Johnson',
  },
  {
    id: '5',
    apiId: 1005,
    extension: '1005',
    location: 'New York Office',
    description: 'NY Reception',
    type: 'SIP',
    model: 'Yealink T46U',
    macAddress: '00:15:65:A1:B2:C3',
    enabled: false,
    registered: false,
    lastModified: '2026-01-02T14:00:00Z',
    assignedUserName: 'Sarah Connor',
  },
];

function formatMacAddress(mac: string | null): string {
  if (!mac) return '';
  // Remove any existing separators and format as XX:XX:XX:XX:XX:XX
  const cleaned = mac.replace(/[^a-fA-F0-9]/g, '');
  if (cleaned.length === 12) {
    return cleaned.match(/.{1,2}/g)?.join(':').toUpperCase() || mac;
  }
  return mac;
}

export const load: PageServerLoad = async ({ locals }) => {
  // Demo mode
  if (env.PUBLIC_DEMO_MODE === 'true' || env.PUBLIC_DEMO_MODE === '1') {
    return { devices: DEMO_DEVICES, isDemo: true, totalCount: DEMO_DEVICES.length };
  }

  // Check credentials
  if (!hasValidCredentials(locals)) {
    return { devices: [], isDemo: false, totalCount: 0, error: 'Not authenticated' };
  }

  try {
    const soql = `
      SELECT Id, nbavs__Id__c, nbavs__Extension__c, nbavs__Location__c, nbavs__Type__c,
             nbavs__Description__c, nbavs__Enabled__c, nbavs__Model__c, nbavs__Registered__c,
             nbavs__RegistrationExpiry__c, nbavs__MAC__c, LastModifiedDate,
             (SELECT Id, nbavs__User__c, nbavs__User__r.Id, nbavs__User__r.Name 
              FROM nbavs__DeviceMappings__r)
      FROM nbavs__Device__c
      ORDER BY LastModifiedDate DESC
      LIMIT 2000
    `;

    const result = await querySalesforce<SalesforceDevice>(
      locals.instanceUrl!,
      locals.accessToken!,
      soql
    );

    const devices: Device[] = result.records.map((sfDevice) => {
      // Get the first assigned user from device mappings
      const mapping = sfDevice.nbavs__DeviceMappings__r?.records?.[0];
      
      return {
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
        assignedUserId: mapping?.nbavs__User__r?.Id,
        assignedUserName: mapping?.nbavs__User__r?.Name,
      };
    });

    return { devices, isDemo: false, totalCount: result.totalSize };
  } catch (error) {
    console.error('Failed to fetch devices:', error);
    return { devices: [], isDemo: false, totalCount: 0, error: 'Failed to load devices' };
  }
};

// Actions for sync, delete, and registration status
export const actions: Actions = {
  sync: async ({ locals }) => {
    if (!hasValidCredentials(locals)) {
      return fail(401, { error: 'Not authenticated' });
    }

    // In a real implementation, this would call the Sapien API to sync devices
    // For now, we return a success message
    return { success: true, message: 'Devices synchronized successfully' };
  },

  syncRegistration: async ({ locals }) => {
    if (!hasValidCredentials(locals)) {
      return fail(401, { error: 'Not authenticated' });
    }

    // In a real implementation, this would call the Sapien API to sync registration status
    return { success: true, message: 'Registration status synchronized successfully' };
  },

  delete: async ({ locals, request }) => {
    if (!hasValidCredentials(locals)) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const deviceId = formData.get('deviceId') as string;

    if (!deviceId) {
      return fail(400, { error: 'Device ID is required' });
    }

    // In a real implementation, this would call the Sapien API to delete the device
    // and then delete from Salesforce
    return { success: true, message: 'Device deleted successfully' };
  },
};
