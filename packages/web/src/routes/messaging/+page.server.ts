/**
 * Messaging Page Server
 * 
 * Uses repository pattern for platform-agnostic data loading.
 */

import type { PageServerLoad } from './$types';
import { tryCreateContextAndRepositories, isSalesforceContext } from '$lib/adapters';
import { getLicenseFromSapien, fetchApiSettings } from '$lib/server/gatekeeper';

interface MessagingStats {
  smsSentToday: number;
  smsReceivedToday: number;
  whatsappSentToday: number;
  whatsappReceivedToday: number;
  activeNumbers: number;
}

interface MessagingPhoneNumber {
  id: string;
  name: string;
  number: string;
  smsEnabled: boolean;
  mmsEnabled: boolean;
}

interface MessagingConfig {
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
  smsSentToday: 245,
  smsReceivedToday: 189,
  whatsappSentToday: 78,
  whatsappReceivedToday: 56,
  activeNumbers: 12,
};

const DEMO_PHONE_NUMBERS: MessagingPhoneNumber[] = [
  { id: '1', name: 'Main Support', number: '+442031234567', smsEnabled: true, mmsEnabled: false },
  { id: '2', name: 'Sales Team', number: '+442087654321', smsEnabled: true, mmsEnabled: true },
  { id: '3', name: 'Customer Service', number: '+447700900123', smsEnabled: true, mmsEnabled: true },
];

export const load: PageServerLoad = async ({ locals }) => {
  const result = tryCreateContextAndRepositories(locals);

  if (!result) {
    return {
      stats: DEMO_STATS,
      phoneNumbers: DEMO_PHONE_NUMBERS,
      config: { smsEnabled: true, whatsappEnabled: true, whatsappConfigured: true },
      isDemo: true,
    } satisfies MessagingPageData;
  }

  const { repos, isDemo } = result;

  if (isDemo) {
    return {
      stats: DEMO_STATS,
      phoneNumbers: DEMO_PHONE_NUMBERS,
      config: { smsEnabled: true, whatsappEnabled: true, whatsappConfigured: true },
      isDemo: true,
    } satisfies MessagingPageData;
  }

  try {
    // Fetch phone numbers with SMS capability
    let phoneNumbers: MessagingPhoneNumber[] = [];
    try {
      const phoneResult = await repos.phoneNumbers.findAll({ page: 1, pageSize: 1000 });
      phoneNumbers = phoneResult.items
        .filter(pn => pn.capabilities?.sms)
        .map(pn => ({
          id: pn.id,
          name: pn.name,
          number: pn.number,
          smsEnabled: pn.capabilities?.sms || false,
          mmsEnabled: pn.capabilities?.mms || false,
        }));
    } catch (e) {
      console.warn('Failed to fetch SMS phone numbers:', e);
    }

    // Fetch messaging settings from license (Settings_v1__c is a protected custom setting)
    let config: MessagingConfig = {
      smsEnabled: false,
      whatsappEnabled: false,
      whatsappConfigured: false,
    };

    try {
      // Get SMS/WhatsApp enabled from license via Sapien
      if (isSalesforceContext(result.ctx)) {
        await fetchApiSettings(result.ctx.instanceUrl, result.ctx.accessToken);
        const license = await getLicenseFromSapien(result.ctx.instanceUrl, result.ctx.accessToken);
        if (license) {
          config = {
            smsEnabled: Boolean(license.SMS__c),
            whatsappEnabled: Boolean(license.WhatsApp__c),
            whatsappConfigured: Boolean(license.WhatsApp__c), // Assume configured if licensed
          };
        }
      }
    } catch (e) {
      console.warn('Failed to fetch messaging settings from license:', e);
    }

    return {
      stats: {
        smsSentToday: 0,
        smsReceivedToday: 0,
        whatsappSentToday: 0,
        whatsappReceivedToday: 0,
        activeNumbers: phoneNumbers.length,
      },
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
