import { querySalesforce, hasValidCredentials } from '$lib/server/salesforce';
import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

interface SalesforceUser {
  Id: string;
  Name: string;
  nbavs__Id__c: string;
  nbavs__SipExtension__c: string;
  nbavs__MobilePhone__c: string;
  nbavs__CTI__c: boolean;
  nbavs__PBX__c: boolean;
  nbavs__Manager__c: boolean;
  nbavs__Record__c: boolean;
  nbavs__PCI__c: boolean;
  nbavs__Insights__c: boolean;
}

interface SalesforceGroupMember {
  Id: string;
  nbavs__Group__r: {
    Id: string;
    Name: string;
    nbavs__Extension__c: string;
    nbavs__GroupPickup__c: string;
    nbavs__PBX__c: boolean;
    nbavs__Manager__c: boolean;
  };
  nbavs__Primary__c: boolean;
}

interface SalesforceDevice {
  Id: string;
  Name: string;
  nbavs__Number__c: string;
  nbavs__Type__c: string;
  nbavs__Enabled__c: boolean;
  nbavs__Registered__c: boolean;
}

interface SalesforceVoicemail {
  Id: string;
  nbavs__UUID__c: string;
  nbavs__CallStart__c: string;
  nbavs__DialledNumber__c: string;
  nbavs__TotalDuration__c: number;
  nbavs__VMStatus__c: boolean;
}

interface SalesforceCallLog {
  Id: string;
  nbavs__DateTime__c: string;
  nbavs__FromNumber__c: string;
  nbavs__ToNumber__c: string;
  nbavs__TimeTalking__c: number;
  nbavs__Direction__c: string;
}

export interface UserGroup {
  id: string;
  name: string;
  extension: string;
  groupPickup: string;
  isPrimary: boolean;
  hasPbxOrManager: boolean;
}

export interface UserDevice {
  id: string;
  name: string;
  number: string;
  type: string;
  isEnabled: boolean;
  isRegistered: boolean;
}

export interface Voicemail {
  id: string;
  uuid: string;
  dateTime: string;
  dialledNumber: string;
  duration: string;
  canPlay: boolean;
}

export interface CallLog {
  id: string;
  dateTime: string;
  fromNumber: string;
  toNumber: string;
  duration: string;
  direction: string;
}

export interface UserProfileData {
  user: {
    id: string;
    name: string;
    sapienId: string;
    extension: string;
    mobilePhone: string;
    licenses: {
      cti: boolean;
      pbx: boolean;
      manager: boolean;
      record: boolean;
      pci: boolean;
      insights: boolean;
    };
  } | null;
  groups: UserGroup[];
  devices: UserDevice[];
  activeInboundNumbers: string[];
  voicemails: Voicemail[];
  recentCalls: CallLog[];
  lastCallDate: string | null;
  ddis: string[];
  isDemo: boolean;
  error?: string;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '0 Seconds';
  if (seconds < 60) return `${seconds} Second${seconds !== 1 ? 's' : ''}`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) return `${mins} Minute${mins !== 1 ? 's' : ''}`;
  return `${mins}m ${secs}s`;
}

function formatDateTime(isoString: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }) + ' ' + date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getRelativeTime(isoString: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffYears = Math.floor(diffDays / 365);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} Minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} Hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 365) return `${diffDays} Day${diffDays !== 1 ? 's' : ''} ago`;
  return `${diffYears} Year${diffYears !== 1 ? 's' : ''} ago`;
}

// Demo data
const DEMO_DATA: UserProfileData = {
  user: {
    id: 'demo-user',
    name: 'Jim Page',
    sapienId: '12345',
    extension: '2666',
    mobilePhone: '+44 07870361412',
    licenses: {
      cti: true,
      pbx: true,
      manager: true,
      record: true,
      pci: true,
      insights: true,
    },
  },
  groups: [],
  devices: [],
  activeInboundNumbers: ['12003', '12027', '447870361412', '12197', '12203', '12207'],
  voicemails: [],
  recentCalls: [
    { id: '1', dateTime: '11/04/2023 09:34:24', fromNumber: '2024', toNumber: '442035100500', duration: '2 Seconds', direction: 'INTERNAL' },
    { id: '2', dateTime: '23/03/2023 13:27:10', fromNumber: '2014', toNumber: '442035100500', duration: '42 Seconds', direction: 'INTERNAL' },
    { id: '3', dateTime: '02/03/2023 11:11:10', fromNumber: '2173', toNumber: '442035100500', duration: '19 Seconds', direction: 'INTERNAL' },
    { id: '4', dateTime: '02/02/2023 10:27:43', fromNumber: '2173', toNumber: '442035100500', duration: '23 Seconds', direction: 'INTERNAL' },
    { id: '5', dateTime: '14/12/2022 12:00:14', fromNumber: '2636', toNumber: '442035100500', duration: '2 Seconds', direction: 'INTERNAL' },
    { id: '6', dateTime: '12/12/2022 16:09:36', fromNumber: '2636', toNumber: '442035100500', duration: '13 Seconds', direction: 'INTERNAL' },
    { id: '7', dateTime: '09/11/2022 13:23:06', fromNumber: '2228', toNumber: '442035100500', duration: '24 Seconds', direction: 'INTERNAL' },
    { id: '8', dateTime: '09/11/2022 13:20:45', fromNumber: '2228', toNumber: '442035100500', duration: '22 Seconds', direction: 'INTERNAL' },
    { id: '9', dateTime: '14/09/2022 10:40:38', fromNumber: '2000', toNumber: '442035100500', duration: '0 Seconds', direction: 'INTERNAL' },
    { id: '10', dateTime: '05/09/2022 13:05:49', fromNumber: '2014', toNumber: '442035100500', duration: '1 Second', direction: 'INTERNAL' },
  ],
  lastCallDate: '2023-04-11T09:34:24Z',
  ddis: ['+442035101291', '+4433315016666'],
  isDemo: true,
};

export const load: PageServerLoad = async ({ locals }) => {
  // Demo mode
  if (env.DEMO_MODE === 'true' || env.DEMO_MODE === '1') {
    return { data: DEMO_DATA };
  }

  // Check credentials
  if (!hasValidCredentials(locals)) {
    return { data: { ...DEMO_DATA, isDemo: false, user: null, error: 'Not authenticated' } };
  }

  try {
    // First, find the AVS User record for the current Salesforce user
    const sfUserId = locals.user?.id;
    if (!sfUserId) {
      return { data: { ...DEMO_DATA, isDemo: false, user: null, error: 'User not found' } };
    }

    // Get AVS User by Salesforce User ID
    const userResult = await querySalesforce<SalesforceUser>(
      locals.instanceUrl!,
      locals.accessToken!,
      `SELECT Id, Name, nbavs__Id__c, nbavs__SipExtension__c, nbavs__MobilePhone__c,
              nbavs__CTI__c, nbavs__PBX__c, nbavs__Manager__c, nbavs__Record__c, 
              nbavs__PCI__c, nbavs__Insights__c
       FROM nbavs__User__c 
       WHERE nbavs__User__c = '${sfUserId}' 
       LIMIT 1`
    );

    if (userResult.records.length === 0) {
      return { data: { ...DEMO_DATA, isDemo: false, user: null, error: 'AVS User profile not found' } };
    }

    const avsUser = userResult.records[0];

    // Fetch groups, devices, voicemails, and recent calls in parallel
    const [groupsResult, devicesResult, voicemailsResult, callLogsResult, phoneNumbersResult] = await Promise.all([
      // Groups
      querySalesforce<SalesforceGroupMember>(
        locals.instanceUrl!,
        locals.accessToken!,
        `SELECT Id, nbavs__Primary__c, 
                nbavs__Group__r.Id, nbavs__Group__r.Name, 
                nbavs__Group__r.nbavs__Extension__c, nbavs__Group__r.nbavs__GroupPickup__c,
                nbavs__Group__r.nbavs__PBX__c, nbavs__Group__r.nbavs__Manager__c
         FROM nbavs__GroupMember__c 
         WHERE nbavs__User__c = '${avsUser.Id}'
         ORDER BY nbavs__Primary__c DESC`
      ).catch(() => ({ records: [] as SalesforceGroupMember[], totalSize: 0, done: true })),

      // Devices
      querySalesforce<SalesforceDevice>(
        locals.instanceUrl!,
        locals.accessToken!,
        `SELECT Id, Name, nbavs__Number__c, nbavs__Type__c, nbavs__Enabled__c, nbavs__Registered__c
         FROM nbavs__UserDevice__c 
         WHERE nbavs__User__c = '${avsUser.Id}'`
      ).catch(() => ({ records: [] as SalesforceDevice[], totalSize: 0, done: true })),

      // Voicemails (last 5)
      querySalesforce<SalesforceVoicemail>(
        locals.instanceUrl!,
        locals.accessToken!,
        `SELECT Id, nbavs__UUID__c, nbavs__CallStart__c, nbavs__DialledNumber__c, 
                nbavs__TotalDuration__c, nbavs__VMStatus__c
         FROM nbavs__Voicemail__c 
         WHERE nbavs__User__c = '${avsUser.Id}'
         ORDER BY nbavs__CallStart__c DESC
         LIMIT 5`
      ).catch(() => ({ records: [] as SalesforceVoicemail[], totalSize: 0, done: true })),

      // Recent calls (last 10)
      querySalesforce<SalesforceCallLog>(
        locals.instanceUrl!,
        locals.accessToken!,
        `SELECT Id, nbavs__DateTime__c, nbavs__FromNumber__c, nbavs__ToNumber__c, 
                nbavs__TimeTalking__c, nbavs__Direction__c
         FROM nbavs__CallLog__c 
         WHERE nbavs__User__c = '${avsUser.Id}'
         ORDER BY nbavs__DateTime__c DESC
         LIMIT 10`
      ).catch(() => ({ records: [] as SalesforceCallLog[], totalSize: 0, done: true })),

      // User's DDIs
      querySalesforce<{ nbavs__Number__c: string }>(
        locals.instanceUrl!,
        locals.accessToken!,
        `SELECT nbavs__Number__c 
         FROM nbavs__PhoneNumber__c 
         WHERE nbavs__User__c = '${avsUser.Id}'`
      ).catch(() => ({ records: [] as { nbavs__Number__c: string }[], totalSize: 0, done: true })),
    ]);

    // Get last call date for the "Last Call was X ago" message
    const lastCallDate = callLogsResult.records.length > 0
      ? callLogsResult.records[0].nbavs__DateTime__c
      : null;

    // Extract active inbound numbers from devices
    const activeInboundNumbers = devicesResult.records
      .filter(d => d.nbavs__Enabled__c)
      .map(d => d.nbavs__Number__c)
      .filter(Boolean);

    const data: UserProfileData = {
      user: {
        id: avsUser.Id,
        name: avsUser.Name || '',
        sapienId: avsUser.nbavs__Id__c || '',
        extension: avsUser.nbavs__SipExtension__c || '',
        mobilePhone: avsUser.nbavs__MobilePhone__c || '',
        licenses: {
          cti: avsUser.nbavs__CTI__c || false,
          pbx: avsUser.nbavs__PBX__c || false,
          manager: avsUser.nbavs__Manager__c || false,
          record: avsUser.nbavs__Record__c || false,
          pci: avsUser.nbavs__PCI__c || false,
          insights: avsUser.nbavs__Insights__c || false,
        },
      },
      groups: groupsResult.records.map((gm) => ({
        id: gm.nbavs__Group__r?.Id || '',
        name: gm.nbavs__Group__r?.Name || '',
        extension: gm.nbavs__Group__r?.nbavs__Extension__c || '',
        groupPickup: gm.nbavs__Group__r?.nbavs__GroupPickup__c || '',
        isPrimary: gm.nbavs__Primary__c || false,
        hasPbxOrManager: (gm.nbavs__Group__r?.nbavs__PBX__c || gm.nbavs__Group__r?.nbavs__Manager__c) || false,
      })),
      devices: devicesResult.records.map((d) => ({
        id: d.Id,
        name: d.Name || '',
        number: d.nbavs__Number__c || '',
        type: d.nbavs__Type__c || '',
        isEnabled: d.nbavs__Enabled__c || false,
        isRegistered: d.nbavs__Registered__c || false,
      })),
      activeInboundNumbers,
      voicemails: voicemailsResult.records.map((vm) => ({
        id: vm.Id,
        uuid: vm.nbavs__UUID__c || '',
        dateTime: formatDateTime(vm.nbavs__CallStart__c),
        dialledNumber: vm.nbavs__DialledNumber__c || '',
        duration: formatDuration(vm.nbavs__TotalDuration__c),
        canPlay: vm.nbavs__VMStatus__c || false,
      })),
      recentCalls: callLogsResult.records.map((cl) => ({
        id: cl.Id,
        dateTime: formatDateTime(cl.nbavs__DateTime__c),
        fromNumber: cl.nbavs__FromNumber__c || '',
        toNumber: cl.nbavs__ToNumber__c || '',
        duration: formatDuration(cl.nbavs__TimeTalking__c),
        direction: cl.nbavs__Direction__c || '',
      })),
      lastCallDate: lastCallDate ? getRelativeTime(lastCallDate) : null,
      ddis: phoneNumbersResult.records.map((pn) => pn.nbavs__Number__c),
      isDemo: false,
    };

    return { data };
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    return { data: { ...DEMO_DATA, isDemo: false, error: 'Failed to load user profile' } };
  }
};
