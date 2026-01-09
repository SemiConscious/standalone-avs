/**
 * Sounds Page Server
 * 
 * Uses repository pattern for platform-agnostic data loading.
 */

import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { createAdapterContext, isSalesforceContext, getRepositories } from '$lib/adapters';
import { canUseSapienApi, getSapienAccessToken, getSapienHost, getOrganizationId } from '$lib/server/gatekeeper';
import { sapienRequest } from '$lib/server/sapien';
import type { Sound, PaginationMeta } from '$lib/domain';

export type { Sound };

export interface SoundsPageData {
  sounds: Sound[];
  pagination: PaginationMeta;
  isDemo: boolean;
  canCreateTTS: boolean;
  error?: string;
}

function parseQueryParams(url: URL) {
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '50', 10);
  const sortBy = url.searchParams.get('sortBy') || 'name';
  const sortOrder = (url.searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc';
  const search = url.searchParams.get('search') || undefined;

  return {
    page: Math.max(1, page),
    pageSize: Math.min(100, Math.max(1, pageSize)),
    sortBy,
    sortOrder,
    search,
  };
}

export const load: PageServerLoad<SoundsPageData> = async ({ locals, url }) => {
  let ctx;
  try {
    ctx = createAdapterContext(locals);
  } catch {
    return {
      sounds: [],
      pagination: {
        page: 1,
        pageSize: 50,
        totalItems: 0,
        totalPages: 0,
        hasPreviousPage: false,
        hasNextPage: false,
      },
      isDemo: false,
      canCreateTTS: false,
      error: 'Not authenticated',
    };
  }

  const canCreateTTS = isSalesforceContext(ctx) && canUseSapienApi(locals);

  try {
    const { sounds: soundRepo } = getRepositories(ctx);
    const params = parseQueryParams(url);
    const result = await soundRepo.findAll(params);

    return {
      sounds: result.items,
      pagination: result.pagination,
      isDemo: ctx.platform === 'demo',
      canCreateTTS,
    };
  } catch (error) {
    console.error('Failed to fetch sounds:', error);
    return {
      sounds: [],
      pagination: {
        page: 1,
        pageSize: 50,
        totalItems: 0,
        totalPages: 0,
        hasPreviousPage: false,
        hasNextPage: false,
      },
      isDemo: ctx.platform === 'demo',
      canCreateTTS,
      error: error instanceof Error ? error.message : 'Failed to load sounds',
    };
  }
};

export const actions: Actions = {
  createTTS: async ({ locals, request }) => {
    let ctx;
    try {
      ctx = createAdapterContext(locals);
    } catch {
      return fail(401, { error: 'Not authenticated' });
    }

    if (!isSalesforceContext(ctx)) {
      return fail(400, { error: 'TTS creation requires Salesforce connection' });
    }

    if (!canUseSapienApi(locals)) {
      return fail(400, { error: 'Sapien API is not configured' });
    }

    const formData = await request.formData();
    const name = formData.get('name')?.toString();
    const text = formData.get('text')?.toString();
    const voice = formData.get('voice')?.toString() || 'en-US-Standard-A';

    if (!name || !text) {
      return fail(400, { error: 'Name and text are required' });
    }

    try {
      const sapienAccessToken = await getSapienAccessToken(ctx.instanceUrl, ctx.accessToken);
      const sapienHost = getSapienHost();
      const organizationId = getOrganizationId();

      if (!sapienHost || !organizationId) {
        return fail(500, { error: 'Sapien configuration missing' });
      }

      await sapienRequest(sapienHost, sapienAccessToken, 'POST', `/organisation/${organizationId}/sound/tts`, {
        name,
        text,
        voice,
      });

      return { success: true, message: 'TTS sound created successfully' };
    } catch (error) {
      console.error('Failed to create TTS sound:', error);
      return fail(500, { error: error instanceof Error ? error.message : 'Failed to create TTS sound' });
    }
  },

  delete: async ({ locals, request }) => {
    let ctx;
    try {
      ctx = createAdapterContext(locals);
    } catch {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const soundId = formData.get('soundId')?.toString();

    if (!soundId) {
      return fail(400, { error: 'Sound ID is required' });
    }

    try {
      const { sounds: soundRepo } = getRepositories(ctx);
      const result = await soundRepo.delete(soundId);

      if (!result.success) {
        return fail(500, { error: result.error || 'Failed to delete sound' });
      }

      return { success: true, message: 'Sound deleted successfully' };
    } catch (error) {
      return fail(500, { error: error instanceof Error ? error.message : 'Failed to delete sound' });
    }
  },
};
