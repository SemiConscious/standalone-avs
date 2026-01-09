/**
 * Wallboards Page Server
 * 
 * Uses repository pattern for platform-agnostic data loading.
 */

import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { tryCreateContextAndRepositories } from '$lib/adapters';
import { canUseSapienApi } from '$lib/server/gatekeeper';
import type { Wallboard } from '$lib/domain';

export interface WallboardsPageData {
  wallboards: Wallboard[];
  isDemo: boolean;
  sapienConnected: boolean;
  error?: string;
}

// Demo data
const DEMO_WALLBOARDS: Wallboard[] = [
  { id: '1', name: 'Main Call Center', description: 'Primary call center wallboard', type: 'queue', enabled: true, lastModified: '2026-01-05T10:00:00Z' },
  { id: '2', name: 'Sales Team', description: 'Sales department metrics', type: 'agent', enabled: true, lastModified: '2026-01-04T14:30:00Z' },
  { id: '3', name: 'Support Queue', description: 'Customer support queue stats', type: 'queue', enabled: false, lastModified: '2026-01-03T09:15:00Z' },
];

export const load: PageServerLoad<WallboardsPageData> = async ({ locals }) => {
  const result = tryCreateContextAndRepositories(locals);

  if (!result) {
    return {
      wallboards: DEMO_WALLBOARDS,
      isDemo: true,
      sapienConnected: false,
    };
  }

  const { repos, isDemo } = result;
  const sapienConnected = !isDemo && canUseSapienApi(locals);

  if (isDemo) {
    return {
      wallboards: DEMO_WALLBOARDS,
      isDemo: true,
      sapienConnected: false,
    };
  }

  try {
    const wallboardResult = await repos.wallboards.findAll({ page: 1, pageSize: 100 });

    return {
      wallboards: wallboardResult.items,
      isDemo: false,
      sapienConnected,
    };
  } catch (error) {
    console.error('Wallboard data not available:', error);
    return {
      wallboards: [],
      isDemo: false,
      sapienConnected,
      error: 'Wallboards not available for this user',
    };
  }
};

export const actions: Actions = {
  create: async ({ locals, request }) => {
    const result = tryCreateContextAndRepositories(locals);
    if (!result) {
      return fail(401, { error: 'Not authenticated' });
    }

    const { repos, isDemo } = result;
    if (isDemo) {
      return fail(400, { error: 'Cannot create wallboards in demo mode' });
    }

    const formData = await request.formData();
    const name = formData.get('name')?.toString();
    const description = formData.get('description')?.toString() || '';
    const type = (formData.get('type')?.toString() || 'queue') as 'queue' | 'agent' | 'custom';

    if (!name) {
      return fail(400, { error: 'Name is required' });
    }

    try {
      const createResult = await repos.wallboards.create({
        name,
        description,
        type,
        enabled: true,
      });

      if (!createResult.success) {
        return fail(500, { error: createResult.error || 'Failed to create wallboard' });
      }

      return { success: true, message: 'Wallboard created successfully' };
    } catch (error) {
      return fail(500, { error: error instanceof Error ? error.message : 'Failed to create wallboard' });
    }
  },

  delete: async ({ locals, request }) => {
    const result = tryCreateContextAndRepositories(locals);
    if (!result) {
      return fail(401, { error: 'Not authenticated' });
    }

    const { repos, isDemo } = result;
    if (isDemo) {
      return fail(400, { error: 'Cannot delete wallboards in demo mode' });
    }

    const formData = await request.formData();
    const wallboardId = formData.get('wallboardId')?.toString();

    if (!wallboardId) {
      return fail(400, { error: 'Wallboard ID is required' });
    }

    try {
      const deleteResult = await repos.wallboards.delete(wallboardId);

      if (!deleteResult.success) {
        return fail(500, { error: deleteResult.error || 'Failed to delete wallboard' });
      }

      return { success: true, message: 'Wallboard deleted successfully' };
    } catch (error) {
      return fail(500, { error: error instanceof Error ? error.message : 'Failed to delete wallboard' });
    }
  },
};
