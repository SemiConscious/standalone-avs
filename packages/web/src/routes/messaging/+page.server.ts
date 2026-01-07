import { querySalesforce, hasValidCredentials } from '$lib/server/salesforce';
import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

interface SalesforcePhoneNumber {
  Id: string;
  Name: string;
  nbavs__Number__c: string;
  nbavs__Capability_SMS__c: boolean;
  nbavs__Capability_MMS__c: boolean;
}

interface SalesforceSettings {
  Id: string;
  nbavs__SMSEnabled__c: boolean;
  nbavs__WhatsAppEnabled__c: boolean;
  nbavs__WhatsAppBusinessId__c: string;
}

export interface MessagingStats {
  smsSentToday: number;
  smsReceivedToday: number;
  whatsappSentToday: number;
  whatsappReceivedToday: number;
  activeNumbers: number;
}

export interface MessagingPhoneNumber {
  id: string;
  name: string;
  number: string;
  smsEnabled: boolean;
  mmsEnabled: boolean;
}

export interface MessagingConfig {
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  whatsappConfigured: boolean;
}

export interface MessagingPageData {
  stats: MessagingStats;
  phoneNumbers: MessagingPhoneNumber[];
  config: MessagingConfig;
  isDemo: boolean;
  error?: string;
}

// Demo data
const DEMO_STATS: MessagingStats = {
  smsSentToday: 1234,
  smsReceivedToday: 856,
  whatsappSentToday: 456,
  whatsappReceivedToday: 312,
  activeNumbers: 8,
};

const DEMO_PHONE_NUMBERS: MessagingPhoneNumber[] = [
  { id: '1', name: 'Main SMS Line', number: '+44 20 3510 0500', smsEnabled: true, mmsEnabled: true },
  { id: '2', name: 'Support SMS', number: '+44 20 3510 0501', smsEnabled: true, mmsEnabled: false },
  { id: '3', name: 'Sales SMS', number: '+44 20 3510 0502', smsEnabled: true, mmsEnabled: true },
];

const DEMO_CONFIG: MessagingConfig = {
  smsEnabled: true,
  whatsappEnabled: false,
  whatsappConfigured: false,
};

export const load: PageServerLoad = async ({ locals }) => {
  // Demo mode
  if (env.PUBLIC_DEMO_MODE === 'true' || env.PUBLIC_DEMO_MODE === '1') {
    return {
      stats: DEMO_STATS,
      phoneNumbers: DEMO_PHONE_NUMBERS,
      config: DEMO_CONFIG,
      isDemo: true,
    } satisfies MessagingPageData;
  }

  // Check credentials
  if (!hasValidCredentials(locals)) {
    return {
      stats: { smsSentToday: 0, smsReceivedToday: 0, whatsappSentToday: 0, whatsappReceivedToday: 0, activeNumbers: 0 },
      phoneNumbers: [],
      config: { smsEnabled: false, whatsappEnabled: false, whatsappConfigured: false },
      isDemo: false,
      error: 'Not authenticated',
    } satisfies MessagingPageData;
  }

  try {
    // Fetch phone numbers with SMS capability
    const phoneNumberSoql = `
      SELECT Id, Name, nbavs__Number__c, nbavs__Capability_SMS__c, nbavs__Capability_MMS__c
      FROM nbavs__PhoneNumber__c
      WHERE nbavs__Capability_SMS__c = true
      ORDER BY Name
      LIMIT 100
    `;

    let phoneNumbers: MessagingPhoneNumber[] = [];
    try {
      const result = await querySalesforce<SalesforcePhoneNumber>(
        locals.instanceUrl!,
        locals.accessToken!,
        phoneNumberSoql
      );

      phoneNumbers = result.records.map((pn) => ({
        id: pn.Id,
        name: pn.Name,
        number: pn.nbavs__Number__c || '',
        smsEnabled: pn.nbavs__Capability_SMS__c || false,
        mmsEnabled: pn.nbavs__Capability_MMS__c || false,
      }));
    } catch (e) {
      console.warn('Failed to fetch messaging phone numbers:', e);
    }

    // Fetch messaging settings
    let config: MessagingConfig = { smsEnabled: false, whatsappEnabled: false, whatsappConfigured: false };
    try {
      const settingsSoql = `
        SELECT Id, nbavs__SMSEnabled__c, nbavs__WhatsAppEnabled__c, nbavs__WhatsAppBusinessId__c
        FROM nbavs__Settings_v1__c
        LIMIT 1
      `;

      const settingsResult = await querySalesforce<SalesforceSettings>(
        locals.instanceUrl!,
        locals.accessToken!,
        settingsSoql
      );

      if (settingsResult.records.length > 0) {
        const s = settingsResult.records[0];
        config = {
          smsEnabled: s.nbavs__SMSEnabled__c || false,
          whatsappEnabled: s.nbavs__WhatsAppEnabled__c || false,
          whatsappConfigured: !!s.nbavs__WhatsAppBusinessId__c,
        };
      }
    } catch (e) {
      console.warn('Failed to fetch messaging settings:', e);
    }

    // Note: Actual message counts would need to come from the Sapien API
    const stats: MessagingStats = {
      smsSentToday: 0,
      smsReceivedToday: 0,
      whatsappSentToday: 0,
      whatsappReceivedToday: 0,
      activeNumbers: phoneNumbers.length,
    };

    return {
      stats,
      phoneNumbers,
      config,
      isDemo: false,
    } satisfies MessagingPageData;
  } catch (error) {
    console.error('Failed to fetch messaging data:', error);
    return {
      stats: { smsSentToday: 0, smsReceivedToday: 0, whatsappSentToday: 0, whatsappReceivedToday: 0, activeNumbers: 0 },
      phoneNumbers: [],
      config: { smsEnabled: false, whatsappEnabled: false, whatsappConfigured: false },
      isDemo: false,
      error: 'Failed to load messaging data',
    } satisfies MessagingPageData;
  }
};

