/**
 * Demo Settings Data
 */

import type { InsightsSettings, OrgSettings } from '$lib/domain';

export const DEMO_INSIGHTS_SETTINGS: InsightsSettings = {
  language: 'en-GB',
  provider: 'TranscriptDG',
  enabled: true,
  summarizationEnabled: true,
  accessByRecordingAccess: false,
  endUserAccess: true,
};

export const DEMO_ORG_SETTINGS: OrgSettings = {
  timeZone: 'Europe/London',
  voice: 'en-GB-Lucy',
  countryCode: 'GB',
  externalCallerIdNumber: '442035100500',
  presentCallerId: true,
  homeRegion: 'EU',
  insights: DEMO_INSIGHTS_SETTINGS,
};
