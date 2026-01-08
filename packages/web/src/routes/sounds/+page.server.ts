import type { PageServerLoad, Actions } from './$types';
import { hasValidCredentials } from '$lib/server/salesforce';
import { getSapienAccessToken, getSapienHost, getOrganizationId } from '$lib/server/gatekeeper';
import {
  getSoundFiles,
  getVoices,
  createTTSSound,
  deleteSoundFile,
  type SoundFile,
  type TTSVoice,
} from '$lib/server/tts';
import { env } from '$env/dynamic/private';
import { fail } from '@sveltejs/kit';

// Demo data
const DEMO_SOUNDS: SoundFile[] = [
  {
    id: 'sound-001',
    name: 'Welcome Message',
    description: 'Main IVR welcome greeting',
    type: 'tts',
    duration: 8.5,
    format: 'mp3',
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z',
    organizationId: 12345,
    metadata: {
      voiceId: 'joanna',
      text: 'Welcome to Acme Corporation. Your call is important to us.',
      language: 'en-US',
    },
  },
  {
    id: 'sound-002',
    name: 'Hold Music',
    description: 'Customer hold music',
    type: 'upload',
    duration: 120,
    size: 1540000,
    format: 'mp3',
    createdAt: '2025-12-15T14:30:00Z',
    updatedAt: '2025-12-15T14:30:00Z',
    organizationId: 12345,
  },
  {
    id: 'sound-003',
    name: 'Transfer Notice',
    description: 'Playing before call transfer',
    type: 'tts',
    duration: 4.2,
    format: 'mp3',
    createdAt: '2025-11-20T09:15:00Z',
    updatedAt: '2025-11-20T09:15:00Z',
    organizationId: 12345,
    metadata: {
      voiceId: 'matthew',
      text: 'Please hold while we transfer your call.',
      language: 'en-US',
    },
  },
  {
    id: 'sound-004',
    name: 'After Hours',
    description: 'Played outside business hours',
    type: 'tts',
    duration: 12.3,
    format: 'mp3',
    createdAt: '2025-10-05T16:45:00Z',
    updatedAt: '2025-10-05T16:45:00Z',
    organizationId: 12345,
    metadata: {
      voiceId: 'joanna',
      text: 'Thank you for calling. Our office is currently closed. Please call back during business hours or leave a message.',
      language: 'en-US',
    },
  },
  {
    id: 'sound-005',
    name: 'Queue Position',
    description: 'Queue position announcement',
    type: 'tts',
    duration: 5.8,
    format: 'mp3',
    createdAt: '2025-09-10T11:20:00Z',
    updatedAt: '2025-09-10T11:20:00Z',
    organizationId: 12345,
    metadata: {
      voiceId: 'matthew',
      text: 'You are currently number {{position}} in the queue.',
      language: 'en-US',
    },
  },
];

const DEMO_VOICES: TTSVoice[] = [
  { id: 'joanna', name: 'Joanna', language: 'English (US)', languageCode: 'en-US', gender: 'female', provider: 'aws', neural: true },
  { id: 'matthew', name: 'Matthew', language: 'English (US)', languageCode: 'en-US', gender: 'male', provider: 'aws', neural: true },
  { id: 'amy', name: 'Amy', language: 'English (UK)', languageCode: 'en-GB', gender: 'female', provider: 'aws', neural: true },
  { id: 'brian', name: 'Brian', language: 'English (UK)', languageCode: 'en-GB', gender: 'male', provider: 'aws', neural: true },
  { id: 'hans', name: 'Hans', language: 'German', languageCode: 'de-DE', gender: 'male', provider: 'aws', neural: true },
  { id: 'marlene', name: 'Marlene', language: 'German', languageCode: 'de-DE', gender: 'female', provider: 'aws', neural: false },
  { id: 'celine', name: 'Céline', language: 'French', languageCode: 'fr-FR', gender: 'female', provider: 'aws', neural: true },
  { id: 'mathieu', name: 'Mathieu', language: 'French', languageCode: 'fr-FR', gender: 'male', provider: 'aws', neural: false },
];

export interface SoundsPageData {
  sounds: SoundFile[];
  voices: TTSVoice[];
  isDemo: boolean;
  error?: string;
}

export const load: PageServerLoad = async ({ locals }) => {
  // Demo mode
  if (env.PUBLIC_DEMO_MODE === 'true' || env.PUBLIC_DEMO_MODE === '1') {
    return {
      sounds: DEMO_SOUNDS,
      voices: DEMO_VOICES,
      isDemo: true,
    } satisfies SoundsPageData;
  }

  // Check credentials
  if (!hasValidCredentials(locals)) {
    return {
      sounds: [],
      voices: [],
      isDemo: false,
      error: 'Not authenticated',
    } satisfies SoundsPageData;
  }

  try {
    // Get Sapien access token and settings
    const sapienToken = await getSapienAccessToken(locals.instanceUrl!, locals.accessToken!);
    const sapienHost = getSapienHost();
    const orgId = getOrganizationId();

    const ttsHost = env.TTS_HOST || sapienHost;
    if (!ttsHost) {
      throw new Error('TTS API host not configured');
    }

    if (!orgId) {
      throw new Error('Organization ID not configured');
    }

    // Fetch sounds and voices in parallel using Sapien access token
    const [sounds, voices] = await Promise.all([
      getSoundFiles(ttsHost, sapienToken, orgId).catch(() => []),
      getVoices(ttsHost, sapienToken, orgId).catch(() => DEMO_VOICES), // Fallback to demo voices
    ]);

    return {
      sounds,
      voices,
      isDemo: false,
    } satisfies SoundsPageData;
  } catch (e) {
    console.error('Failed to load sounds:', e);
    return {
      sounds: [],
      voices: DEMO_VOICES,
      isDemo: false,
      error: e instanceof Error ? e.message : 'Failed to load sounds',
    } satisfies SoundsPageData;
  }
};

export const actions: Actions = {
  create: async ({ locals, request }) => {
    if (!hasValidCredentials(locals)) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const text = formData.get('text') as string;
    const voiceId = formData.get('voiceId') as string;
    const description = formData.get('description') as string | null;

    if (!name || !text || !voiceId) {
      return fail(400, { error: 'Name, text, and voice are required' });
    }

    try {
      // Get Sapien access token and settings
      const sapienToken = await getSapienAccessToken(locals.instanceUrl!, locals.accessToken!);
      const sapienHost = getSapienHost();
      const orgId = getOrganizationId();

      const ttsHost = env.TTS_HOST || sapienHost;
      if (!ttsHost) {
        throw new Error('TTS API host not configured');
      }

      if (!orgId) {
        throw new Error('Organization ID not configured');
      }

      await createTTSSound(ttsHost, sapienToken, orgId, name, text, voiceId, description || undefined);

      return { success: true };
    } catch (e) {
      console.error('Failed to create sound:', e);
      return fail(500, { error: e instanceof Error ? e.message : 'Failed to create sound' });
    }
  },

  delete: async ({ locals, request }) => {
    if (!hasValidCredentials(locals)) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const soundId = formData.get('soundId') as string;

    if (!soundId) {
      return fail(400, { error: 'Sound ID is required' });
    }

    try {
      // Get Sapien access token and settings
      const sapienToken = await getSapienAccessToken(locals.instanceUrl!, locals.accessToken!);
      const sapienHost = getSapienHost();
      const orgId = getOrganizationId();

      const ttsHost = env.TTS_HOST || sapienHost;
      if (!ttsHost) {
        throw new Error('TTS API host not configured');
      }

      if (!orgId) {
        throw new Error('Organization ID not configured');
      }

      await deleteSoundFile(ttsHost, sapienToken, orgId, soundId);

      return { success: true };
    } catch (e) {
      console.error('Failed to delete sound:', e);
      return fail(500, { error: e instanceof Error ? e.message : 'Failed to delete sound' });
    }
  },
};

