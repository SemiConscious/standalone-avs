/**
 * Routing Policies Page Server
 * 
 * Uses repository pattern for platform-agnostic data loading.
 */

import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { createAdapterContext, getRepositories } from '$lib/adapters';
import type { RoutingPolicy, PaginationMeta } from '$lib/domain';

export type { RoutingPolicy };

export interface RoutingPoliciesPageData {
  policies: RoutingPolicy[];
  pagination: PaginationMeta;
  isDemo: boolean;
  error?: string;
}

function parseQueryParams(url: URL) {
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '25', 10);
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

export const load: PageServerLoad<RoutingPoliciesPageData> = async ({ locals, url }) => {
  let ctx;
  try {
    ctx = createAdapterContext(locals);
  } catch {
    return {
      policies: [],
      pagination: {
        page: 1,
        pageSize: 25,
        totalItems: 0,
        totalPages: 0,
        hasPreviousPage: false,
        hasNextPage: false,
      },
      isDemo: false,
      error: 'Not authenticated',
    };
  }

  try {
    const { routingPolicies: policyRepo } = getRepositories(ctx);
    const params = parseQueryParams(url);
    const result = await policyRepo.findAll(params);

    return {
      policies: result.items,
      pagination: result.pagination,
      isDemo: ctx.platform === 'demo',
    };
  } catch (error) {
    console.error('Failed to fetch routing policies:', error);
    return {
      policies: [],
      pagination: {
        page: 1,
        pageSize: 25,
        totalItems: 0,
        totalPages: 0,
        hasPreviousPage: false,
        hasNextPage: false,
      },
      isDemo: ctx.platform === 'demo',
      error: error instanceof Error ? error.message : 'Failed to load routing policies',
    };
  }
};

export const actions: Actions = {
  delete: async ({ locals, request }) => {
    let ctx;
    try {
      ctx = createAdapterContext(locals);
    } catch {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const policyId = formData.get('policyId')?.toString();

    if (!policyId) {
      return fail(400, { error: 'Policy ID is required' });
    }

    try {
      const { routingPolicies: policyRepo } = getRepositories(ctx);
      const result = await policyRepo.delete(policyId);

      if (!result.success) {
        return fail(500, { error: result.error || 'Failed to delete policy' });
      }

      return { success: true, message: 'Policy deleted successfully' };
    } catch (error) {
      return fail(500, { error: error instanceof Error ? error.message : 'Failed to delete policy' });
    }
  },
};
