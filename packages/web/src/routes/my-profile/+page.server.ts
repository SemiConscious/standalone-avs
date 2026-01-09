/**
 * My Profile Page Server
 * 
 * Uses repository pattern for platform-agnostic data loading.
 * Note: Sapien API calls for call logs remain as external API integrations.
 */

import { tryCreateContextAndRepositories, isSalesforceContext } from '$lib/adapters';
import { getCallLogs } from '$lib/server/sapien';
import { getOrganizationId, getSapienAccessToken, getSapienHost } from '$lib/server/gatekeeper';
import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

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
    homeCountry: string;
    homeCountryCode: string;
    defaultVoice: string;
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
  activeInboundNumbers: { number: string; enabled: boolean }[];
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
    homeCountry: 'United Kingdom (+44)',
    homeCountryCode: '44',
    defaultVoice: 'British: Simon',
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
  activeInboundNumbers: [
    { number: '12003', enabled: true },
    { number: '12027', enabled: true },
    { number: '447870361412', enabled: true },
    { number: '12197', enabled: false },
    { number: '12203', enabled: false },
    { number: '12207', enabled: false },
  ],
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
  const result = tryCreateContextAndRepositories(locals);

  if (!result) {
    return { data: DEMO_DATA };
  }

  const { repos, isDemo, ctx } = result;

  if (isDemo) {
    return { data: DEMO_DATA };
  }

  try {
    // Get the current Salesforce user ID
    const sfUserId = locals.user?.id || locals.salesforce?.user?.id;
    if (!sfUserId) {
      return { data: { ...DEMO_DATA, isDemo: false, user: null, error: 'User not found' } };
    }

    // Get AVS User by Salesforce User ID using repository
    const avsUser = await repos.users.findBySalesforceUserId(sfUserId);
    if (!avsUser) {
      return { data: { ...DEMO_DATA, isDemo: false, user: null, error: 'AVS User profile not found' } };
    }

    // Fetch profile data using repository
    const profileData = await repos.users.getProfileData(avsUser.id);

    // Fetch call logs from Sapien API (external integration - not part of repository pattern)
    let callLogs: CallLog[] = [];
    let lastCallDate: string | null = null;

    if (isSalesforceContext(ctx)) {
      try {
        const sapienAccessToken = await getSapienAccessToken(ctx.instanceUrl, ctx.accessToken);
        const sapienUserId = avsUser.platformId;
        const organizationId = getOrganizationId();
        const sapienHost = getSapienHost() || env.SAPIEN_HOST;

        if (sapienUserId && organizationId && sapienHost) {
          const sapienCallLogs = await getCallLogs(sapienHost, sapienAccessToken, organizationId, sapienUserId, 10);

          callLogs = sapienCallLogs.map((cl, index) => ({
            id: String(cl.id || index),
            dateTime: cl.timeStart ? formatDateTime(cl.timeStart) : '',
            fromNumber: cl.fromNumber || '',
            toNumber: cl.toNumber || '',
            duration: formatDuration(cl.timeTalking ?? null),
            direction: cl.direction || '',
          }));

          const firstCallLog = sapienCallLogs[0];
          if (firstCallLog?.timeStart) {
            lastCallDate = getRelativeTime(firstCallLog.timeStart);
          }
        }
      } catch (error) {
        console.error('Failed to fetch call logs from Sapien:', error);
        // Continue without call logs - not a fatal error
      }
    }

    const data: UserProfileData = {
      user: {
        id: avsUser.id,
        name: avsUser.name,
        sapienId: avsUser.platformId ? String(avsUser.platformId) : '',
        extension: avsUser.sipExtension || '',
        mobilePhone: avsUser.mobilePhone || '',
        homeCountry: profileData.homeCountry || '',
        homeCountryCode: profileData.homeCountryCode || '',
        defaultVoice: profileData.defaultVoice || '',
        licenses: {
          cti: avsUser.licenses.cti,
          pbx: avsUser.licenses.pbx,
          manager: avsUser.licenses.manager,
          record: avsUser.licenses.record,
          pci: avsUser.licenses.pci,
          insights: avsUser.licenses.insights,
        },
      },
      groups: profileData.groups.map(g => ({
        id: g.id,
        name: g.name,
        extension: g.extension || '',
        groupPickup: g.groupPickup || '',
        isPrimary: g.isPrimary,
        hasPbxOrManager: g.hasPbxOrManager,
      })),
      devices: profileData.devices.map(d => ({
        id: d.id,
        name: d.name,
        number: d.number || '',
        type: d.type || '',
        isEnabled: d.isEnabled,
        isRegistered: d.isRegistered,
      })),
      activeInboundNumbers: profileData.activeInboundNumbers,
      voicemails: profileData.voicemails.map(vm => ({
        id: vm.id,
        uuid: vm.uuid,
        dateTime: formatDateTime(vm.dateTime),
        dialledNumber: vm.dialledNumber,
        duration: formatDuration(vm.duration),
        canPlay: vm.canPlay,
      })),
      recentCalls: callLogs,
      lastCallDate,
      ddis: profileData.ddis,
      isDemo: false,
    };

    return { data };
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    return { data: { ...DEMO_DATA, isDemo: false, error: 'Failed to load user profile' } };
  }
};
