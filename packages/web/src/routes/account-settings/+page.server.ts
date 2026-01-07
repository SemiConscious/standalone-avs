import { querySalesforce, hasValidCredentials } from '$lib/server/salesforce';
import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

// Types for settings
interface OrgSettings {
  id?: string;
  accessOwnRecordings: boolean;
  contactLookupEnable: boolean;
  accountLookupEnable: boolean;
  leadLookupEnable: boolean;
  enableSkillsReporting: boolean;
  showNumberLabelInMyCallerId: boolean;
  scvnbaTranscriptionBatchSize: number;
  optimizedTransfer: boolean;
  enableEnhancedWrapup: boolean;
  transcriptionLanguage: string;
  insightTranscriptionLanguage: string;
  callSummarization: boolean;
  temporaryConsentDuration: string;
  autoDeactivateUsers: boolean;
  scvnbaEnabled: boolean;
  scvMissedCallNotificationsEnabled: boolean;
  transcriptionProvider: string;
}

interface AccountSettings {
  id?: string;
  holdMusic: string;
  holdMusicShoutcast: string;
  countryCode: string;
  countryCodeLabel: string;
  timeZone: string;
  voice: string;
  voiceLabel: string;
  presentCallerId: boolean;
  externalCallerIdNumber: string;
  controlByRecordingAccess: boolean;
  enableEndUserAccessAllInsights: boolean;
  newUsersTrackCTIDevice: boolean;
  permissionsLevelManagementViaSF: boolean;
  reportingInterval: number;
}

interface UISettings {
  pageSize: string;
}

interface AvailabilityProfile {
  id: string;
  sapienId: number;
  name: string;
  createdById: string;
  createdByName: string;
}

interface Skill {
  id: string;
  sapienId: number;
  name: string;
  description: string;
  proficiency: string;
  weight: number;
}

interface Sound {
  id: string;
  sapienId: number;
  tag: string;
  description: string;
  size: number;
  modified: string;
  created: string;
  createdById: string;
  createdByName: string;
}

interface Preset {
  name: string;
  value: string;
  type: string;
}

export interface AccountSettingsData {
  orgSettings: OrgSettings;
  accountSettings: AccountSettings;
  uiSettings: UISettings;
  license: {
    manager: boolean;
    insights: boolean;
    sms: boolean;
    whatsApp: boolean;
  };
  availabilityProfiles: AvailabilityProfile[];
  skills: Skill[];
  sounds: Sound[];
  presets: {
    holdMusic: { value: string; label: string }[];
    countryCode: { value: string; label: string }[];
    timeZone: { value: string; label: string }[];
    voice: { value: string; label: string }[];
    pageSize: { value: string; label: string }[];
    transcriptionLanguage: { value: string; label: string }[];
    batchSize: { value: string; label: string }[];
    consentDuration: { value: string; label: string }[];
  };
  isDemo: boolean;
  error?: string;
}

// Demo data
const DEMO_DATA: AccountSettingsData = {
  orgSettings: {
    accessOwnRecordings: true,
    contactLookupEnable: true,
    accountLookupEnable: true,
    leadLookupEnable: true,
    enableSkillsReporting: true,
    showNumberLabelInMyCallerId: false,
    scvnbaTranscriptionBatchSize: 1,
    optimizedTransfer: false,
    enableEnhancedWrapup: true,
    transcriptionLanguage: 'English',
    insightTranscriptionLanguage: 'English (UK)',
    callSummarization: true,
    temporaryConsentDuration: '24',
    autoDeactivateUsers: false,
    scvnbaEnabled: false,
    scvMissedCallNotificationsEnabled: false,
    transcriptionProvider: 'TranscriptDG',
  },
  accountSettings: {
    holdMusic: 'Classical',
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
  },
  uiSettings: {
    pageSize: '1000',
  },
  license: {
    manager: true,
    insights: true,
    sms: true,
    whatsApp: false,
  },
  availabilityProfiles: [
    { id: 'a00001', sapienId: 614860, name: 'Support level 2', createdById: 'u001', createdByName: 'Yerko Bizama' },
    { id: 'a00002', sapienId: 492589, name: 'Ms TEST', createdById: 'u002', createdByName: 'Mohamed Ahmed' },
    { id: 'a00003', sapienId: 362247, name: 'Platform Support', createdById: 'u003', createdByName: 'Naela Sili' },
    { id: 'a00004', sapienId: 267778, name: 'Team', createdById: 'u004', createdByName: 'Abol Ibrahim' },
    { id: 'a00005', sapienId: 2706, name: 'Service Cloud Voice Beta', createdById: 'u005', createdByName: 'Matt Reeve' },
    { id: 'a00006', sapienId: 2701, name: 'Service Cloud Voice Beta', createdById: 'u005', createdByName: 'Matt Reeve' },
    { id: 'a00007', sapienId: 1632, name: 'Support level 2', createdById: 'u006', createdByName: 'Joel Livesley' },
    { id: 'a00008', sapienId: 848, name: 'Tech', createdById: 'u007', createdByName: 'Neil Burgess' },
    { id: 'a00009', sapienId: 299, name: 'Default', createdById: 'u008', createdByName: 'Lee McIneraith' },
    { id: 'a00010', sapienId: 292, name: 'Support level 1', createdById: 'u008', createdByName: 'Lee McIneraith' },
  ],
  skills: [
    { id: 's001', sapienId: 1, name: 'US', description: '', proficiency: 'No knowledge', weight: 0 },
    { id: 's002', sapienId: 2, name: 'UK', description: '', proficiency: 'No knowledge', weight: 0 },
    { id: 's003', sapienId: 3, name: 'Support', description: '', proficiency: 'Basic', weight: 10 },
    { id: 's004', sapienId: 4, name: 'First_Line_Sales', description: '', proficiency: 'No knowledge', weight: 0 },
    { id: 's005', sapienId: 5, name: 'DE', description: '', proficiency: 'No knowledge', weight: 0 },
    { id: 's006', sapienId: 6, name: 'AUS', description: '', proficiency: 'No knowledge', weight: 0 },
  ],
  sounds: [
    { id: 'snd001', sapienId: 121304, tag: 'Phoneringing', description: 'The sound of a phone ringing for fake AI transfers', size: 82290, modified: '2026-01-05T10:12:30Z', created: '2026-01-05T10:12:30Z', createdById: 'u001', createdByName: 'Simon Woodward' },
    { id: 'snd002', sapienId: 50022, tag: 'speakline', description: 'speakline', size: 743630, modified: '2020-02-13T15:07:24Z', created: '2020-02-13T15:07:24Z', createdById: 'u002', createdByName: 'Joel Livesley' },
    { id: 'snd003', sapienId: 41923, tag: 'Blare163037', description: 'Created by phone', size: 140040, modified: '2018-12-06T16:40:04Z', created: '2018-12-06T16:40:04Z', createdById: 'u003', createdByName: 'Jamie Cooper' },
    { id: 'snd004', sapienId: 36560, tag: 'PBWelcome', description: 'PBWelcome', size: 332830, modified: '2018-03-06T11:01:44Z', created: '2018-03-06T11:01:44Z', createdById: 'u004', createdByName: 'James Radford' },
    { id: 'snd005', sapienId: 36113, tag: 'AusQueuesSupport', description: 'AusQueuesSupport', size: 216220, modified: '2017-11-15T16:54:12Z', created: '2017-11-15T16:54:12Z', createdById: 'u005', createdByName: 'Jonathan Doherty' },
    { id: 'snd006', sapienId: 33847, tag: 'Newivr45', description: 'NEWIVR45', size: 418790, modified: '2017-08-15T17:11:10Z', created: '2017-08-15T17:10:54Z', createdById: 'u005', createdByName: 'Jonathan Doherty' },
    { id: 'snd007', sapienId: 33845, tag: 'Newivr39', description: 'NEWIVR39', size: 447330, modified: '2017-08-15T17:10:54Z', created: '2017-08-15T17:10:54Z', createdById: 'u005', createdByName: 'Jonathan Doherty' },
  ],
  presets: {
    holdMusic: [
      { value: 'CLASSICAL', label: 'Classical' },
      { value: 'JAZZ', label: 'Jazz' },
      { value: 'POP', label: 'Pop' },
      { value: 'ROCK', label: 'Rock' },
      { value: 'SHOUTCAST', label: 'Custom URL' },
    ],
    countryCode: [
      { value: 'GB', label: 'United Kingdom' },
      { value: 'US', label: 'United States' },
      { value: 'DE', label: 'Germany' },
      { value: 'FR', label: 'France' },
      { value: 'AU', label: 'Australia' },
    ],
    timeZone: [
      { value: 'Europe/London', label: 'Europe/London' },
      { value: 'America/New_York', label: 'America/New_York' },
      { value: 'America/Los_Angeles', label: 'America/Los_Angeles' },
      { value: 'Europe/Paris', label: 'Europe/Paris' },
      { value: 'Australia/Sydney', label: 'Australia/Sydney' },
    ],
    voice: [
      { value: 'en-GB-Lucy', label: 'English (GB): Lucy-AI' },
      { value: 'en-US-Joey', label: 'English (US): Joey-AI' },
      { value: 'de-DE-Hans', label: 'German: Hans-AI' },
      { value: 'fr-FR-Celine', label: 'French: Celine-AI' },
    ],
    pageSize: [
      { value: '10', label: '10' },
      { value: '25', label: '25' },
      { value: '50', label: '50' },
      { value: '100', label: '100' },
      { value: '500', label: '500' },
      { value: '1000', label: '1000' },
    ],
    transcriptionLanguage: [
      { value: 'English', label: 'English' },
      { value: 'English (UK)', label: 'English (UK)' },
      { value: 'English (US)', label: 'English (US)' },
      { value: 'German', label: 'German' },
      { value: 'French', label: 'French' },
      { value: 'Spanish', label: 'Spanish' },
    ],
    batchSize: Array.from({ length: 25 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })),
    consentDuration: [
      { value: '24', label: '24 hours' },
      { value: '48', label: '48 hours' },
      { value: '72', label: '72 hours' },
    ],
  },
  isDemo: true,
};

export const load: PageServerLoad = async ({ locals }) => {
  // Demo mode
  if (env.PUBLIC_DEMO_MODE === 'true' || env.PUBLIC_DEMO_MODE === '1') {
    return { data: DEMO_DATA };
  }

  // Check credentials
  if (!hasValidCredentials(locals)) {
    return { data: { ...DEMO_DATA, isDemo: false, error: 'Not authenticated' } };
  }

  try {
    // Fetch all settings in parallel
    const [
      orgSettingsResult,
      uiSettingsResult,
      accountSettingsResult,
      licenseResult,
      availabilityProfilesResult,
      skillsResult,
      soundsResult,
      presetsResult,
    ] = await Promise.all([
      querySalesforce<{
        Id: string;
        nbavs__AccessOwnRecordings__c: boolean;
        nbavs__ContactLookupEnable__c: boolean;
        nbavs__AccountLookupEnable__c: boolean;
        nbavs__LeadLookupEnable__c: boolean;
        nbavs__Enable_Skills_Reporting__c: boolean;
        nbavs__Show_Number_Label_in_My_Caller_ID__c: boolean;
        nbavs__SCVNBA_TranscriptionBatchSize__c: number;
        nbavs__Optimized_Transfer__c: boolean;
        nbavs__EnableEnhancedWrapup__c: boolean;
        nbavs__TranscriptionLanguage__c: string;
        nbavs__InsightTranscriptionLanguage__c: string;
        nbavs__CallSummarization__c: boolean;
        nbavs__TemporaryConsentDuration__c: string;
        nbavs__Auto_Deactivate_Users__c: boolean;
        nbavs__SCVNBA_Enabled__c: boolean;
        nbavs__SCV_MissedCallNotificationsEnabled__c: boolean;
        nbavs__TranscriptionProvider__c: string;
      }>(
        locals.instanceUrl!,
        locals.accessToken!,
        `SELECT Id, nbavs__AccessOwnRecordings__c, nbavs__ContactLookupEnable__c, nbavs__AccountLookupEnable__c, 
         nbavs__LeadLookupEnable__c, nbavs__Enable_Skills_Reporting__c, nbavs__Show_Number_Label_in_My_Caller_ID__c,
         nbavs__SCVNBA_TranscriptionBatchSize__c, nbavs__Optimized_Transfer__c, nbavs__EnableEnhancedWrapup__c,
         nbavs__TranscriptionLanguage__c, nbavs__InsightTranscriptionLanguage__c, nbavs__CallSummarization__c,
         nbavs__TemporaryConsentDuration__c, nbavs__Auto_Deactivate_Users__c, nbavs__SCVNBA_Enabled__c,
         nbavs__SCV_MissedCallNotificationsEnabled__c, nbavs__TranscriptionProvider__c
         FROM nbavs__Settings_v1__c LIMIT 1`
      ),
      querySalesforce<{ Id: string; nbavs__PageSize__c: string }>(
        locals.instanceUrl!,
        locals.accessToken!,
        'SELECT Id, nbavs__PageSize__c FROM nbavs__UISettings_v1__c LIMIT 1'
      ),
      querySalesforce<{
        Id: string;
        nbavs__HoldMusic__c: string;
        nbavs__HoldMusicShoutcast__c: string;
        nbavs__CountryCode__c: string;
        nbavs__CountryCodeLabel__c: string;
        nbavs__TimeZone__c: string;
        nbavs__Voice__c: string;
        nbavs__VoiceLabel__c: string;
        nbavs__PresentCallerId__c: boolean;
        nbavs__ExternalCallerIdNumber__c: string;
        nbavs__Control_by_Recording_Access__c: boolean;
        nbavs__Enable_End_User_Access_All_Insights__c: boolean;
        nbavs__NewUsersTrackCTIDevice__c: boolean;
        nbavs__Permissions_Level_management_via_SF__c: boolean;
        nbavs__ReportingInterval__c: number;
      }>(
        locals.instanceUrl!,
        locals.accessToken!,
        `SELECT Id, nbavs__HoldMusic__c, nbavs__HoldMusicShoutcast__c, nbavs__CountryCode__c, nbavs__CountryCodeLabel__c,
         nbavs__TimeZone__c, nbavs__Voice__c, nbavs__VoiceLabel__c, nbavs__PresentCallerId__c, nbavs__ExternalCallerIdNumber__c,
         nbavs__Control_by_Recording_Access__c, nbavs__Enable_End_User_Access_All_Insights__c, nbavs__NewUsersTrackCTIDevice__c,
         nbavs__Permissions_Level_management_via_SF__c, nbavs__ReportingInterval__c
         FROM nbavs__Settings_v1__c LIMIT 1`
      ),
      querySalesforce<{
        nbavs__Manager__c: boolean;
        nbavs__Insights__c: boolean;
        nbavs__SMS__c: boolean;
        nbavs__WhatsApp__c: boolean;
      }>(
        locals.instanceUrl!,
        locals.accessToken!,
        'SELECT nbavs__Manager__c, nbavs__Insights__c, nbavs__SMS__c, nbavs__WhatsApp__c FROM nbavs__License_v1__c LIMIT 1'
      ),
      querySalesforce<{
        Id: string;
        nbavs__Id__c: number;
        Name: string;
        CreatedById: string;
        CreatedBy: { Name: string };
      }>(
        locals.instanceUrl!,
        locals.accessToken!,
        'SELECT Id, nbavs__Id__c, Name, CreatedById, CreatedBy.Name FROM nbavs__AvailabilityProfile__c ORDER BY CreatedDate DESC LIMIT 50000'
      ),
      querySalesforce<{
        Id: string;
        nbavs__Id__c: number;
        Name: string;
        nbavs__Description__c: string;
        nbavs__Weight_Preset__c: string;
        nbavs__Weight__c: number;
      }>(
        locals.instanceUrl!,
        locals.accessToken!,
        'SELECT Id, nbavs__Id__c, Name, nbavs__Description__c, nbavs__Weight_Preset__c, nbavs__Weight__c FROM nbavs__Skill__c ORDER BY Name ASC LIMIT 50000'
      ),
      querySalesforce<{
        Id: string;
        nbavs__Id__c: number;
        nbavs__Tag__c: string;
        nbavs__Description__c: string;
        nbavs__Size__c: number;
        nbavs__Modified__c: string;
        nbavs__Created__c: string;
        CreatedById: string;
        CreatedBy: { Name: string };
      }>(
        locals.instanceUrl!,
        locals.accessToken!,
        'SELECT Id, nbavs__Id__c, nbavs__Tag__c, nbavs__Description__c, nbavs__Size__c, nbavs__Modified__c, nbavs__Created__c, CreatedById, CreatedBy.Name FROM nbavs__Sound__c ORDER BY nbavs__Modified__c DESC LIMIT 50000'
      ),
      querySalesforce<{
        Name: string;
        nbavs__Value__c: string;
        nbavs__Type__c: string;
      }>(
        locals.instanceUrl!,
        locals.accessToken!,
        'SELECT Name, nbavs__Value__c, nbavs__Type__c FROM nbavs__Preset__c ORDER BY Name LIMIT 50000'
      ),
    ]);

    // Process org settings
    const orgSettingsRecord = orgSettingsResult.records[0];
    const orgSettings: OrgSettings = orgSettingsRecord
      ? {
          id: orgSettingsRecord.Id,
          accessOwnRecordings: orgSettingsRecord.nbavs__AccessOwnRecordings__c || false,
          contactLookupEnable: orgSettingsRecord.nbavs__ContactLookupEnable__c || false,
          accountLookupEnable: orgSettingsRecord.nbavs__AccountLookupEnable__c || false,
          leadLookupEnable: orgSettingsRecord.nbavs__LeadLookupEnable__c || false,
          enableSkillsReporting: orgSettingsRecord.nbavs__Enable_Skills_Reporting__c || false,
          showNumberLabelInMyCallerId: orgSettingsRecord.nbavs__Show_Number_Label_in_My_Caller_ID__c || false,
          scvnbaTranscriptionBatchSize: orgSettingsRecord.nbavs__SCVNBA_TranscriptionBatchSize__c || 1,
          optimizedTransfer: orgSettingsRecord.nbavs__Optimized_Transfer__c || false,
          enableEnhancedWrapup: orgSettingsRecord.nbavs__EnableEnhancedWrapup__c || false,
          transcriptionLanguage: orgSettingsRecord.nbavs__TranscriptionLanguage__c || 'English',
          insightTranscriptionLanguage: orgSettingsRecord.nbavs__InsightTranscriptionLanguage__c || 'English (UK)',
          callSummarization: orgSettingsRecord.nbavs__CallSummarization__c || false,
          temporaryConsentDuration: orgSettingsRecord.nbavs__TemporaryConsentDuration__c || '24',
          autoDeactivateUsers: orgSettingsRecord.nbavs__Auto_Deactivate_Users__c || false,
          scvnbaEnabled: orgSettingsRecord.nbavs__SCVNBA_Enabled__c || false,
          scvMissedCallNotificationsEnabled: orgSettingsRecord.nbavs__SCV_MissedCallNotificationsEnabled__c || false,
          transcriptionProvider: orgSettingsRecord.nbavs__TranscriptionProvider__c || 'TranscriptVB',
        }
      : DEMO_DATA.orgSettings;

    // Process account settings
    const accountSettingsRecord = accountSettingsResult.records[0];
    const accountSettings: AccountSettings = accountSettingsRecord
      ? {
          id: accountSettingsRecord.Id,
          holdMusic: accountSettingsRecord.nbavs__HoldMusic__c || 'CLASSICAL',
          holdMusicShoutcast: accountSettingsRecord.nbavs__HoldMusicShoutcast__c || '',
          countryCode: accountSettingsRecord.nbavs__CountryCode__c || 'GB',
          countryCodeLabel: accountSettingsRecord.nbavs__CountryCodeLabel__c || 'United Kingdom',
          timeZone: accountSettingsRecord.nbavs__TimeZone__c || 'Europe/London',
          voice: accountSettingsRecord.nbavs__Voice__c || 'en-GB-Lucy',
          voiceLabel: accountSettingsRecord.nbavs__VoiceLabel__c || 'English (GB): Lucy-AI',
          presentCallerId: accountSettingsRecord.nbavs__PresentCallerId__c || false,
          externalCallerIdNumber: accountSettingsRecord.nbavs__ExternalCallerIdNumber__c || '',
          controlByRecordingAccess: accountSettingsRecord.nbavs__Control_by_Recording_Access__c || false,
          enableEndUserAccessAllInsights: accountSettingsRecord.nbavs__Enable_End_User_Access_All_Insights__c || false,
          newUsersTrackCTIDevice: accountSettingsRecord.nbavs__NewUsersTrackCTIDevice__c || false,
          permissionsLevelManagementViaSF: accountSettingsRecord.nbavs__Permissions_Level_management_via_SF__c || false,
          reportingInterval: accountSettingsRecord.nbavs__ReportingInterval__c || 48,
        }
      : DEMO_DATA.accountSettings;

    // Process UI settings
    const uiSettingsRecord = uiSettingsResult.records[0];
    const uiSettings: UISettings = uiSettingsRecord
      ? { pageSize: uiSettingsRecord.nbavs__PageSize__c || '1000' }
      : DEMO_DATA.uiSettings;

    // Process license
    const licenseRecord = licenseResult.records[0];
    const license = licenseRecord
      ? {
          manager: licenseRecord.nbavs__Manager__c || false,
          insights: licenseRecord.nbavs__Insights__c || false,
          sms: licenseRecord.nbavs__SMS__c || false,
          whatsApp: licenseRecord.nbavs__WhatsApp__c || false,
        }
      : DEMO_DATA.license;

    // Process availability profiles
    const availabilityProfiles: AvailabilityProfile[] = availabilityProfilesResult.records.map((r) => ({
      id: r.Id,
      sapienId: r.nbavs__Id__c || 0,
      name: r.Name,
      createdById: r.CreatedById,
      createdByName: r.CreatedBy?.Name || 'Unknown',
    }));

    // Process skills
    const skills: Skill[] = skillsResult.records.map((r) => ({
      id: r.Id,
      sapienId: r.nbavs__Id__c || 0,
      name: r.Name,
      description: r.nbavs__Description__c || '',
      proficiency: r.nbavs__Weight_Preset__c || 'No knowledge',
      weight: r.nbavs__Weight__c || 0,
    }));

    // Process sounds
    const sounds: Sound[] = soundsResult.records.map((r) => ({
      id: r.Id,
      sapienId: r.nbavs__Id__c || 0,
      tag: r.nbavs__Tag__c || '',
      description: r.nbavs__Description__c || '',
      size: r.nbavs__Size__c || 0,
      modified: r.nbavs__Modified__c || '',
      created: r.nbavs__Created__c || '',
      createdById: r.CreatedById,
      createdByName: r.CreatedBy?.Name || 'Unknown',
    }));

    // Process presets into grouped options
    const presets = {
      holdMusic: DEMO_DATA.presets.holdMusic,
      countryCode: [] as { value: string; label: string }[],
      timeZone: [] as { value: string; label: string }[],
      voice: [] as { value: string; label: string }[],
      pageSize: DEMO_DATA.presets.pageSize,
      transcriptionLanguage: DEMO_DATA.presets.transcriptionLanguage,
      batchSize: DEMO_DATA.presets.batchSize,
      consentDuration: DEMO_DATA.presets.consentDuration,
    };

    for (const preset of presetsResult.records) {
      const option = { value: preset.nbavs__Value__c, label: preset.Name };
      switch (preset.nbavs__Type__c) {
        case 'CountryCode':
          presets.countryCode.push(option);
          break;
        case 'Timezone':
          presets.timeZone.push(option);
          break;
        case 'Voice':
          presets.voice.push(option);
          break;
      }
    }

    // Fallback to demo presets if empty
    if (presets.countryCode.length === 0) presets.countryCode = DEMO_DATA.presets.countryCode;
    if (presets.timeZone.length === 0) presets.timeZone = DEMO_DATA.presets.timeZone;
    if (presets.voice.length === 0) presets.voice = DEMO_DATA.presets.voice;

    const data: AccountSettingsData = {
      orgSettings,
      accountSettings,
      uiSettings,
      license,
      availabilityProfiles,
      skills,
      sounds,
      presets,
      isDemo: false,
    };

    return { data };
  } catch (error) {
    console.error('Failed to fetch account settings:', error);
    return { data: { ...DEMO_DATA, isDemo: false, error: 'Failed to load account settings' } };
  }
};

