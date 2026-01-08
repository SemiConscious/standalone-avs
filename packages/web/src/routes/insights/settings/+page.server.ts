import { querySalesforce, hasValidCredentials } from '$lib/server/salesforce';
import { env } from '$env/dynamic/private';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

interface SalesforceSettings {
  Id: string;
  nbavs__InsightsLanguage__c: string;
  nbavs__InsightsProvider__c: string;
  nbavs__InsightsEnabled__c: boolean;
  nbavs__InsightsSummarizationEnabled__c: boolean;
  nbavs__InsightsAccessByRecordingAccess__c: boolean;
  nbavs__InsightsEndUserAccess__c: boolean;
}

export interface AIAdvisorSettings {
  language: string;
  provider: string;
  enabled: boolean;
  summarizationEnabled: boolean;
  accessByRecordingAccess: boolean;
  endUserAccess: boolean;
}

export interface AIAdvisorSettingsPageData {
  settings: AIAdvisorSettings;
  isDemo: boolean;
  error?: string;
}

// Demo data
const DEMO_SETTINGS: AIAdvisorSettings = {
  language: 'en-GB',
  provider: 'TranscriptDG',
  enabled: true,
  summarizationEnabled: true,
  accessByRecordingAccess: false,
  endUserAccess: true,
};

const AVAILABLE_LANGUAGES = [
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'de-DE', label: 'German' },
  { value: 'fr-FR', label: 'French' },
  { value: 'es-ES', label: 'Spanish' },
  { value: 'it-IT', label: 'Italian' },
  { value: 'nl-NL', label: 'Dutch' },
];

export const load: PageServerLoad = async ({ locals }) => {
  // Demo mode
  if (env.PUBLIC_DEMO_MODE === 'true' || env.PUBLIC_DEMO_MODE === '1') {
    return {
      settings: DEMO_SETTINGS,
      languages: AVAILABLE_LANGUAGES,
      isDemo: true,
    };
  }

  // Check credentials
  if (!hasValidCredentials(locals)) {
    return {
      settings: DEMO_SETTINGS,
      languages: AVAILABLE_LANGUAGES,
      isDemo: false,
      error: 'Not authenticated',
    };
  }

  try {
    const settingsSoql = `
      SELECT Id, nbavs__InsightsLanguage__c, nbavs__InsightsProvider__c,
             nbavs__InsightsEnabled__c, nbavs__InsightsSummarizationEnabled__c,
             nbavs__InsightsAccessByRecordingAccess__c, nbavs__InsightsEndUserAccess__c
      FROM nbavs__Settings_v1__c
      LIMIT 1
    `;

    const result = await querySalesforce<SalesforceSettings>(
      locals.instanceUrl!,
      locals.accessToken!,
      settingsSoql
    );

    if (result.records.length === 0) {
      return {
        settings: DEMO_SETTINGS,
        languages: AVAILABLE_LANGUAGES,
        isDemo: false,
      };
    }

    const sf = result.records[0];
    const settings: AIAdvisorSettings = {
      language: sf.nbavs__InsightsLanguage__c || 'en-GB',
      provider: sf.nbavs__InsightsProvider__c || 'TranscriptDG',
      enabled: sf.nbavs__InsightsEnabled__c || false,
      summarizationEnabled: sf.nbavs__InsightsSummarizationEnabled__c || false,
      accessByRecordingAccess: sf.nbavs__InsightsAccessByRecordingAccess__c || false,
      endUserAccess: sf.nbavs__InsightsEndUserAccess__c || false,
    };

    return {
      settings,
      languages: AVAILABLE_LANGUAGES,
      isDemo: false,
    };
  } catch (error) {
    console.error('Failed to fetch Insights settings:', error);
    return {
      settings: DEMO_SETTINGS,
      languages: AVAILABLE_LANGUAGES,
      isDemo: false,
      error: 'Failed to load Insights settings',
    };
  }
};

export const actions: Actions = {
  save: async ({ locals, request }) => {
    if (!hasValidCredentials(locals)) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const language = formData.get('language') as string;
    const summarizationEnabled = formData.get('summarizationEnabled') === 'on';
    const accessByRecordingAccess = formData.get('accessByRecordingAccess') === 'on';
    const endUserAccess = formData.get('endUserAccess') === 'on';

    // In a real implementation, this would update the Settings_v1__c record
    console.log('Saving Insights settings:', {
      language,
      summarizationEnabled,
      accessByRecordingAccess,
      endUserAccess,
    });

    return { success: true, message: 'Settings saved successfully' };
  },
};

