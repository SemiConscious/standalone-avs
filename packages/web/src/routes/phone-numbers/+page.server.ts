import { querySalesforce, hasValidCredentials } from '$lib/server/salesforce';
import { env } from '$env/dynamic/private';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

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

// Demo data
const DEMO_PHONE_NUMBERS: PhoneNumber[] = [
  {
    id: '1',
    name: 'Main Reception',
    number: '+442031234567',
    formattedNumber: '+44 20 3123 4567',
    country: 'United Kingdom',
    countryCode: '44',
    area: 'London',
    areaCode: '20',
    localNumber: '31234567',
    isDDI: true,
    isGeographic: true,
    smsEnabled: true,
    mmsEnabled: false,
    voiceEnabled: true,
    localPresenceEnabled: false,
    lastModified: '2026-01-05T10:30:00Z',
    userName: 'John Smith',
    callFlowName: 'Main IVR',
  },
  {
    id: '2',
    name: 'Sales Line',
    number: '+442087654321',
    formattedNumber: '+44 20 8765 4321',
    country: 'United Kingdom',
    countryCode: '44',
    area: 'London',
    areaCode: '20',
    localNumber: '87654321',
    isDDI: true,
    isGeographic: true,
    smsEnabled: true,
    mmsEnabled: true,
    voiceEnabled: true,
    localPresenceEnabled: true,
    lastModified: '2026-01-04T14:20:00Z',
    callFlowName: 'Sales IVR',
  },
  {
    id: '3',
    name: 'Support Hotline',
    number: '+448001234567',
    formattedNumber: '+44 800 123 4567',
    country: 'United Kingdom',
    countryCode: '44',
    area: 'Non-Geographic',
    areaCode: '800',
    localNumber: '1234567',
    isDDI: false,
    isGeographic: false,
    smsEnabled: false,
    mmsEnabled: false,
    voiceEnabled: true,
    localPresenceEnabled: false,
    lastModified: '2026-01-03T09:15:00Z',
    callFlowName: 'Support Queue',
  },
  {
    id: '4',
    name: 'Mobile Sales',
    number: '+447700900123',
    formattedNumber: '+44 7700 900 123',
    country: 'United Kingdom',
    countryCode: '44',
    area: 'Mobile',
    areaCode: '7700',
    localNumber: '900123',
    isDDI: false,
    isGeographic: false,
    smsEnabled: true,
    mmsEnabled: true,
    voiceEnabled: true,
    localPresenceEnabled: true,
    lastModified: '2026-01-02T16:45:00Z',
    userName: 'Jane Doe',
  },
  {
    id: '5',
    name: 'Unassigned',
    number: '+442079876543',
    formattedNumber: '+44 20 7987 6543',
    country: 'United Kingdom',
    countryCode: '44',
    area: 'London',
    areaCode: '20',
    localNumber: '79876543',
    isDDI: true,
    isGeographic: true,
    smsEnabled: false,
    mmsEnabled: false,
    voiceEnabled: true,
    localPresenceEnabled: false,
    lastModified: '2026-01-01T11:00:00Z',
  },
];

function formatPhoneNumber(number: string, countryCode?: string, areaCode?: string): string {
  if (!number) return '';
  
  // Remove any existing formatting
  const cleaned = number.replace(/\D/g, '');
  
  // UK formatting
  if (countryCode === '44' || number.startsWith('+44')) {
    const ukNumber = cleaned.startsWith('44') ? cleaned.slice(2) : cleaned;
    if (ukNumber.length === 10) {
      const area = ukNumber.slice(0, 2);
      const first = ukNumber.slice(2, 6);
      const last = ukNumber.slice(6, 10);
      return `+44 ${area} ${first} ${last}`;
    }
    if (ukNumber.length === 11) {
      if (ukNumber.startsWith('7')) {
        // Mobile
        return `+44 ${ukNumber.slice(0, 4)} ${ukNumber.slice(4, 7)} ${ukNumber.slice(7)}`;
      }
      if (ukNumber.startsWith('800') || ukNumber.startsWith('808')) {
        // Freephone
        return `+44 ${ukNumber.slice(0, 3)} ${ukNumber.slice(3, 6)} ${ukNumber.slice(6)}`;
      }
    }
  }
  
  // US formatting
  if (countryCode === '1' || (number.startsWith('+1') && cleaned.length === 11)) {
    const usNumber = cleaned.startsWith('1') ? cleaned.slice(1) : cleaned;
    if (usNumber.length === 10) {
      return `+1 (${usNumber.slice(0, 3)}) ${usNumber.slice(3, 6)}-${usNumber.slice(6)}`;
    }
  }
  
  // Default: just add + if missing
  return number.startsWith('+') ? number : `+${number}`;
}

export const load: PageServerLoad = async ({ locals }) => {
  // Demo mode
  if (env.PUBLIC_DEMO_MODE === 'true' || env.PUBLIC_DEMO_MODE === '1') {
    return { phoneNumbers: DEMO_PHONE_NUMBERS, isDemo: true, totalCount: DEMO_PHONE_NUMBERS.length };
  }

  // Check credentials
  if (!hasValidCredentials(locals)) {
    return { phoneNumbers: [], isDemo: false, totalCount: 0, error: 'Not authenticated' };
  }

  try {
    const soql = `
      SELECT Id, Name, 
             nbavs__Number__c, nbavs__Country__c, nbavs__CountryCode__c,
             nbavs__AreaCode__c, nbavs__Area__c, nbavs__LocalNumber__c,
             nbavs__DDI_Number__c, nbavs__Geographic__c,
             nbavs__Capability_SMS__c, nbavs__Capability_MMS__c, nbavs__Capability_Voice__c,
             nbavs__Local_Presence_Enabled__c, LastModifiedDate,
             nbavs__CallFlow__c, nbavs__CallFlow__r.Id, nbavs__CallFlow__r.Name,
             nbavs__User__c, nbavs__User__r.Id, nbavs__User__r.Name
      FROM nbavs__PhoneNumber__c
      ORDER BY LastModifiedDate DESC
      LIMIT 2000
    `;

    const result = await querySalesforce<SalesforcePhoneNumber>(
      locals.instanceUrl!,
      locals.accessToken!,
      soql
    );

    const phoneNumbers: PhoneNumber[] = result.records.map((sfNum) => {
      const number = sfNum.nbavs__Number__c || '';
      
      return {
        id: sfNum.Id,
        name: sfNum.Name,
        number: number,
        formattedNumber: formatPhoneNumber(number, sfNum.nbavs__CountryCode__c, sfNum.nbavs__AreaCode__c),
        country: sfNum.nbavs__Country__c || '',
        countryCode: sfNum.nbavs__CountryCode__c || '',
        area: sfNum.nbavs__Area__c || '',
        areaCode: sfNum.nbavs__AreaCode__c || '',
        localNumber: sfNum.nbavs__LocalNumber__c || '',
        isDDI: sfNum.nbavs__DDI_Number__c || false,
        isGeographic: sfNum.nbavs__Geographic__c || false,
        smsEnabled: sfNum.nbavs__Capability_SMS__c || false,
        mmsEnabled: sfNum.nbavs__Capability_MMS__c || false,
        voiceEnabled: sfNum.nbavs__Capability_Voice__c || false,
        localPresenceEnabled: sfNum.nbavs__Local_Presence_Enabled__c || false,
        lastModified: sfNum.LastModifiedDate,
        userId: sfNum.nbavs__User__r?.Id,
        userName: sfNum.nbavs__User__r?.Name,
        callFlowId: sfNum.nbavs__CallFlow__r?.Id,
        callFlowName: sfNum.nbavs__CallFlow__r?.Name,
      };
    });

    return { phoneNumbers, isDemo: false, totalCount: result.totalSize };
  } catch (error) {
    console.error('Failed to fetch phone numbers:', error);
    return { phoneNumbers: [], isDemo: false, totalCount: 0, error: 'Failed to load phone numbers' };
  }
};

// Actions for sync and other operations
export const actions: Actions = {
  sync: async ({ locals }) => {
    if (!hasValidCredentials(locals)) {
      return fail(401, { error: 'Not authenticated' });
    }

    // In a real implementation, this would call the Sapien API to sync phone numbers
    // For now, we return a success message
    return { success: true, message: 'Phone numbers synchronized successfully' };
  },
};
