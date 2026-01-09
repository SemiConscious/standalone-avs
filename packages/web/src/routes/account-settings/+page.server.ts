/**
 * Account Settings Page Server
 * 
 * Uses repository pattern for platform-agnostic data loading.
 */

import { tryCreateContextAndRepositories } from '$lib/adapters';
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
  ],
  skills: [
    { id: 's001', sapienId: 1, name: 'US', description: '', proficiency: 'No knowledge', weight: 0 },
    { id: 's002', sapienId: 2, name: 'UK', description: '', proficiency: 'No knowledge', weight: 0 },
    { id: 's003', sapienId: 3, name: 'Support', description: '', proficiency: 'Basic', weight: 10 },
  ],
  sounds: [
    { id: 'snd001', sapienId: 121304, tag: 'Phoneringing', description: 'The sound of a phone ringing', size: 82290, modified: '2026-01-05T10:12:30Z', created: '2026-01-05T10:12:30Z', createdById: 'u001', createdByName: 'Simon Woodward' },
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
    ],
    voice: [
      { value: 'en-GB-Lucy', label: 'English (GB): Lucy-AI' },
      { value: 'en-US-Joey', label: 'English (US): Joey-AI' },
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
  const result = tryCreateContextAndRepositories(locals);

  if (!result) {
    return { data: DEMO_DATA };
  }

  const { repos, isDemo } = result;

  if (isDemo) {
    return { data: DEMO_DATA };
  }

  try {
    // Fetch all settings using repositories in parallel
    const [
      orgSettingsResult,
      skillsResult,
      soundsResult,
      availabilityProfilesResult,
      accountSettingsResult,
    ] = await Promise.all([
      repos.settings.getOrgSettings().catch(() => null),
      repos.skills.findAll({ page: 1, pageSize: 50000 }).catch(() => ({ items: [] })),
      repos.sounds.findAll({ page: 1, pageSize: 50000 }).catch(() => ({ items: [] })),
      repos.users.getAvailabilityProfiles().catch(() => []),
      repos.settings.getAccountSettings().catch(() => null),
    ]);

    // Build org settings from repository result
    const orgSettings: OrgSettings = orgSettingsResult
      ? {
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
          insightTranscriptionLanguage: orgSettingsResult.insights?.language || 'English (UK)',
          callSummarization: orgSettingsResult.insights?.summarizationEnabled || false,
          temporaryConsentDuration: '24',
          autoDeactivateUsers: false,
          scvnbaEnabled: false,
          scvMissedCallNotificationsEnabled: false,
          transcriptionProvider: orgSettingsResult.insights?.provider || 'TranscriptDG',
        }
      : DEMO_DATA.orgSettings;

    // Build account settings from repository result
    const accountSettings: AccountSettings = accountSettingsResult
      ? {
          holdMusic: accountSettingsResult.holdMusic || 'CLASSICAL',
          holdMusicShoutcast: accountSettingsResult.holdMusicShoutcast || '',
          countryCode: accountSettingsResult.countryCode || 'GB',
          countryCodeLabel: accountSettingsResult.countryCodeLabel || 'United Kingdom',
          timeZone: accountSettingsResult.timeZone || 'Europe/London',
          voice: accountSettingsResult.voice || 'en-GB-Lucy',
          voiceLabel: accountSettingsResult.voiceLabel || 'English (GB): Lucy-AI',
          presentCallerId: accountSettingsResult.presentCallerId || false,
          externalCallerIdNumber: accountSettingsResult.externalCallerIdNumber || '',
          controlByRecordingAccess: accountSettingsResult.controlByRecordingAccess || false,
          enableEndUserAccessAllInsights: accountSettingsResult.enableEndUserAccessAllInsights || false,
          newUsersTrackCTIDevice: accountSettingsResult.newUsersTrackCTIDevice || false,
          permissionsLevelManagementViaSF: accountSettingsResult.permissionsLevelManagementViaSF || false,
          reportingInterval: accountSettingsResult.reportingInterval || 48,
        }
      : DEMO_DATA.accountSettings;

    // Map skills from repository
    const skills: Skill[] = skillsResult.items.map(s => ({
      id: s.id,
      sapienId: s.sapienId || 0,
      name: s.name,
      description: s.description || '',
      proficiency: s.proficiency || 'No knowledge',
      weight: s.weight || 0,
    }));

    // Map sounds from repository
    const sounds: Sound[] = soundsResult.items.map(s => ({
      id: s.id,
      sapienId: s.platformId || 0,
      tag: s.name,
      description: s.description || '',
      size: s.fileSize || 0,
      modified: s.lastModifiedDate || '',
      created: s.createdDate || '',
      createdById: '',
      createdByName: s.createdByName || 'Unknown',
    }));

    // Map availability profiles
    const availabilityProfiles: AvailabilityProfile[] = availabilityProfilesResult.map(p => ({
      id: p.id,
      sapienId: p.sapienId || 0,
      name: p.name,
      createdById: '',
      createdByName: p.createdByName || 'Unknown',
    }));

    // Get presets from settings repository
    let presets = DEMO_DATA.presets;
    try {
      const settingsPresets = await repos.settings.getPresets();
      if (settingsPresets) {
        presets = {
          ...DEMO_DATA.presets,
          countryCode: settingsPresets.countryCode?.length ? settingsPresets.countryCode : DEMO_DATA.presets.countryCode,
          timeZone: settingsPresets.timeZone?.length ? settingsPresets.timeZone : DEMO_DATA.presets.timeZone,
          voice: settingsPresets.voice?.length ? settingsPresets.voice : DEMO_DATA.presets.voice,
        };
      }
    } catch {
      // Use demo presets as fallback
    }

    const data: AccountSettingsData = {
      orgSettings,
      accountSettings,
      uiSettings: { pageSize: '1000' },
      license: {
        manager: true,
        insights: orgSettingsResult?.insights?.enabled || false,
        sms: true,
        whatsApp: false,
      },
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
