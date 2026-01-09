/**
 * Demo Settings Repository
 * Returns static demo settings data
 */

import type { ISettingsRepository, MessagingSettings, AutocompleteConfig, AccountSettingsData, PresetsData } from '$lib/repositories/settings.repository';
import type { InsightsSettings, OrgSettings } from '$lib/domain';
import { DEMO_INSIGHTS_SETTINGS, DEMO_ORG_SETTINGS } from '../data/settings';

// =============================================================================
// Demo Settings Repository
// =============================================================================

export class DemoSettingsRepository implements ISettingsRepository {
  async getInsightsSettings(): Promise<InsightsSettings> {
    return { ...DEMO_INSIGHTS_SETTINGS };
  }

  async getOrgSettings(): Promise<OrgSettings> {
    return { ...DEMO_ORG_SETTINGS };
  }

  async updateInsightsSettings(_settings: Partial<InsightsSettings>): Promise<void> {
    // No-op in demo mode
    console.log('[DemoSettingsRepository] Settings update simulated');
  }

  async getMessagingSettings(): Promise<MessagingSettings> {
    return {
      smsEnabled: true,
      whatsappEnabled: true,
      whatsappConfigured: true,
      whatsappBusinessId: 'demo-business-id',
    };
  }

  async getAutocompleteConfigs(): Promise<AutocompleteConfig[]> {
    return [
      {
        id: 'demo-1',
        developerName: 'Contact_Lookup',
        label: 'Contact Lookup',
        objectName: 'Contact',
        type: 'WHO_ID',
        product: 'AVS',
        active: true,
      },
      {
        id: 'demo-2',
        developerName: 'Account_Lookup',
        label: 'Account Lookup',
        objectName: 'Account',
        type: 'WHAT_ID',
        product: 'AVS',
        active: true,
      },
    ];
  }

  async getAccountSettings(): Promise<AccountSettingsData> {
    return {
      holdMusic: 'CLASSICAL',
      holdMusicShoutcast: '',
      countryCode: 'GB',
      countryCodeLabel: 'United Kingdom',
      timeZone: 'Europe/London',
      voice: 'en-GB-Lucy',
      voiceLabel: 'English (GB): Lucy-AI',
      presentCallerId: true,
      externalCallerIdNumber: '442035100500',
      controlByRecordingAccess: false,
      enableEndUserAccessAllInsights: true,
      newUsersTrackCTIDevice: false,
      permissionsLevelManagementViaSF: false,
      reportingInterval: 48,
    };
  }

  async getPresets(): Promise<PresetsData> {
    return {
      countryCode: [
        { value: 'GB', label: 'United Kingdom' },
        { value: 'US', label: 'United States' },
        { value: 'DE', label: 'Germany' },
      ],
      timeZone: [
        { value: 'Europe/London', label: 'Europe/London' },
        { value: 'America/New_York', label: 'America/New_York' },
      ],
      voice: [
        { value: 'en-GB-Lucy', label: 'English (GB): Lucy-AI' },
        { value: 'en-US-Joey', label: 'English (US): Joey-AI' },
      ],
    };
  }
}
