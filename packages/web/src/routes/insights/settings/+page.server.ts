import { tryCreateContextAndRepositories } from '$lib/adapters';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import type { InsightsSettings } from '$lib/domain';

export interface AIAdvisorSettingsPageData {
  settings: InsightsSettings;
  languages: { value: string; label: string }[];
  isDemo: boolean;
  error?: string;
}

// Demo data
const DEMO_SETTINGS: InsightsSettings = {
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
  const result = tryCreateContextAndRepositories(locals);

  if (!result) {
    return {
      settings: DEMO_SETTINGS,
      languages: AVAILABLE_LANGUAGES,
      isDemo: true,
    };
  }

  const { repos, isDemo } = result;

  if (isDemo) {
    return {
      settings: DEMO_SETTINGS,
      languages: AVAILABLE_LANGUAGES,
      isDemo: true,
    };
  }

  try {
    const settings = await repos.settings.getInsightsSettings();

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
    const result = tryCreateContextAndRepositories(locals);
    if (!result) {
      return fail(401, { error: 'Not authenticated' });
    }

    const { repos, isDemo } = result;
    if (isDemo) {
      return fail(400, { error: 'Cannot save settings in demo mode' });
    }

    const formData = await request.formData();
    const language = formData.get('language') as string;
    const summarizationEnabled = formData.get('summarizationEnabled') === 'on';
    const accessByRecordingAccess = formData.get('accessByRecordingAccess') === 'on';
    const endUserAccess = formData.get('endUserAccess') === 'on';

    try {
      await repos.settings.updateInsightsSettings({
        language,
        summarizationEnabled,
        accessByRecordingAccess,
        endUserAccess,
      });

      return { success: true, message: 'Settings saved successfully' };
    } catch (error) {
      console.error('Failed to save settings:', error);
      return fail(500, { error: error instanceof Error ? error.message : 'Failed to save settings' });
    }
  },
};
