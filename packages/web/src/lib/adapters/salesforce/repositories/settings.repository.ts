/**
 * Salesforce Settings Repository
 * Implements settings data access using the Apex REST endpoint
 */

import type { ISettingsRepository, MessagingSettings, AutocompleteConfig, AccountSettingsData, PresetsData } from '$lib/repositories/settings.repository';
import type { InsightsSettings, OrgSettings } from '$lib/domain';
import type { SalesforceAdapterContext } from '../types';
import { fetchOrgSettings, querySalesforce } from '$lib/server/salesforce';

// =============================================================================
// Salesforce Settings Repository
// =============================================================================

export class SalesforceSettingsRepository implements ISettingsRepository {
  constructor(private ctx: SalesforceAdapterContext) {}

  async getInsightsSettings(): Promise<InsightsSettings> {
    const orgSettings = await fetchOrgSettings(
      this.ctx.instanceUrl,
      this.ctx.accessToken
    );

    return {
      language: (orgSettings.InsightTranscriptionLanguage__c as string) || 'en-GB',
      provider: (orgSettings.TranscriptionProvider__c as string) || 'TranscriptDG',
      enabled: true, // If we can fetch settings, the feature is available
      summarizationEnabled: (orgSettings.CallSummarization__c as boolean) || false,
      accessByRecordingAccess: (orgSettings.Control_by_Recording_Access__c as boolean) || false,
      endUserAccess: (orgSettings.Enable_End_User_Access_All_Insights__c as boolean) || false,
    };
  }

  async getOrgSettings(): Promise<OrgSettings> {
    const sfSettings = await fetchOrgSettings(
      this.ctx.instanceUrl,
      this.ctx.accessToken
    );

    return {
      timeZone: sfSettings.TimeZone__c as string | undefined,
      voice: sfSettings.Voice__c as string | undefined,
      countryCode: sfSettings.CountryCode__c as string | undefined,
      externalCallerIdNumber: sfSettings.ExternalCallerIdNumber__c as string | undefined,
      presentCallerId: sfSettings.PresentCallerId__c as boolean | undefined,
      homeRegion: sfSettings.HomeRegion__c as string | undefined,
      insights: {
        language: (sfSettings.InsightTranscriptionLanguage__c as string) || 'en-GB',
        provider: (sfSettings.TranscriptionProvider__c as string) || 'TranscriptDG',
        enabled: true,
        summarizationEnabled: (sfSettings.CallSummarization__c as boolean) || false,
        accessByRecordingAccess: (sfSettings.Control_by_Recording_Access__c as boolean) || false,
        endUserAccess: (sfSettings.Enable_End_User_Access_All_Insights__c as boolean) || false,
      },
    };
  }

  async updateInsightsSettings(_settings: Partial<InsightsSettings>): Promise<void> {
    // TODO: Implement update via Apex REST endpoint
    // The /HostUrlSettings endpoint supports PATCH for updates
    console.log('[SalesforceSettingsRepository] Update not yet implemented');
  }

  async getMessagingSettings(): Promise<MessagingSettings> {
    const ns = this.ctx.namespace;
    const soql = `
      SELECT Id, ${ns}__SMSEnabled__c, ${ns}__WhatsAppEnabled__c, ${ns}__WhatsAppBusinessId__c
      FROM ${ns}__Settings_v1__c
      LIMIT 1
    `;

    try {
      const result = await querySalesforce<Record<string, unknown>>(
        this.ctx.instanceUrl, 
        this.ctx.accessToken, 
        soql
      );

      if (result.records.length > 0) {
        const settings = result.records[0];
        // Access fields using dynamic namespace
        const smsField = `${ns}__SMSEnabled__c`;
        const whatsappField = `${ns}__WhatsAppEnabled__c`;
        const whatsappIdField = `${ns}__WhatsAppBusinessId__c`;
        
        return {
          smsEnabled: Boolean(settings[smsField]),
          whatsappEnabled: Boolean(settings[whatsappField]),
          whatsappConfigured: Boolean(settings[whatsappIdField]),
          whatsappBusinessId: String(settings[whatsappIdField] || ''),
        };
      }
    } catch (e) {
      console.warn('Failed to fetch messaging settings:', e);
    }

    return {
      smsEnabled: false,
      whatsappEnabled: false,
      whatsappConfigured: false,
    };
  }

  async getAutocompleteConfigs(): Promise<AutocompleteConfig[]> {
    const ns = this.ctx.namespace;
    const soql = `
      SELECT Id, DeveloperName, MasterLabel, ${ns}__Object__c, ${ns}__Type__c, 
             ${ns}__Product__c, ${ns}__Active__c
      FROM ${ns}__AutocompleteConfiguration__mdt
      WHERE ${ns}__Active__c = true
      ORDER BY MasterLabel
      LIMIT 100
    `;

    try {
      const result = await querySalesforce<Record<string, unknown>>(
        this.ctx.instanceUrl,
        this.ctx.accessToken,
        soql
      );

      return (result.records || []).map((r) => ({
        id: r.Id as string,
        developerName: r.DeveloperName as string,
        label: r.MasterLabel as string,
        objectName: r[`${ns}__Object__c`] as string,
        type: r[`${ns}__Type__c`] as string,
        product: r[`${ns}__Product__c`] as string,
        active: r[`${ns}__Active__c`] as boolean,
      }));
    } catch (e) {
      console.warn('Failed to fetch autocomplete configs:', e);
      return [];
    }
  }

  async getAccountSettings(): Promise<AccountSettingsData> {
    const ns = this.ctx.namespace;
    const soql = `
      SELECT Id, ${ns}__HoldMusic__c, ${ns}__HoldMusicShoutcast__c, ${ns}__CountryCode__c, ${ns}__CountryCodeLabel__c,
             ${ns}__TimeZone__c, ${ns}__Voice__c, ${ns}__VoiceLabel__c, ${ns}__PresentCallerId__c, ${ns}__ExternalCallerIdNumber__c,
             ${ns}__Control_by_Recording_Access__c, ${ns}__Enable_End_User_Access_All_Insights__c, ${ns}__NewUsersTrackCTIDevice__c,
             ${ns}__Permissions_Level_management_via_SF__c, ${ns}__ReportingInterval__c
      FROM ${ns}__Settings_v1__c LIMIT 1
    `;

    try {
      const result = await querySalesforce<Record<string, unknown>>(
        this.ctx.instanceUrl,
        this.ctx.accessToken,
        soql
      );

      if (result.records.length > 0) {
        const r = result.records[0];
        return {
          holdMusic: r[`${ns}__HoldMusic__c`] as string,
          holdMusicShoutcast: r[`${ns}__HoldMusicShoutcast__c`] as string,
          countryCode: r[`${ns}__CountryCode__c`] as string,
          countryCodeLabel: r[`${ns}__CountryCodeLabel__c`] as string,
          timeZone: r[`${ns}__TimeZone__c`] as string,
          voice: r[`${ns}__Voice__c`] as string,
          voiceLabel: r[`${ns}__VoiceLabel__c`] as string,
          presentCallerId: r[`${ns}__PresentCallerId__c`] as boolean,
          externalCallerIdNumber: r[`${ns}__ExternalCallerIdNumber__c`] as string,
          controlByRecordingAccess: r[`${ns}__Control_by_Recording_Access__c`] as boolean,
          enableEndUserAccessAllInsights: r[`${ns}__Enable_End_User_Access_All_Insights__c`] as boolean,
          newUsersTrackCTIDevice: r[`${ns}__NewUsersTrackCTIDevice__c`] as boolean,
          permissionsLevelManagementViaSF: r[`${ns}__Permissions_Level_management_via_SF__c`] as boolean,
          reportingInterval: r[`${ns}__ReportingInterval__c`] as number,
        };
      }
    } catch (e) {
      console.warn('Failed to fetch account settings:', e);
    }

    return {};
  }

  async getPresets(): Promise<PresetsData> {
    const ns = this.ctx.namespace;
    const soql = `
      SELECT Name, ${ns}__Value__c, ${ns}__Type__c 
      FROM ${ns}__Preset__c 
      ORDER BY Name 
      LIMIT 50000
    `;

    try {
      const result = await querySalesforce<{
        Name: string;
        nbavs__Value__c: string;
        nbavs__Type__c: string;
      }>(this.ctx.instanceUrl, this.ctx.accessToken, soql);

      const presets: PresetsData = {
        countryCode: [],
        timeZone: [],
        voice: [],
      };

      for (const preset of result.records) {
        const option = { value: preset[`${ns}__Value__c`], label: preset.Name };
        switch (preset[`${ns}__Type__c`]) {
          case 'CountryCode':
            presets.countryCode!.push(option);
            break;
          case 'Timezone':
            presets.timeZone!.push(option);
            break;
          case 'Voice':
            presets.voice!.push(option);
            break;
        }
      }

      return presets;
    } catch (e) {
      console.warn('Failed to fetch presets:', e);
      return {};
    }
  }
}
