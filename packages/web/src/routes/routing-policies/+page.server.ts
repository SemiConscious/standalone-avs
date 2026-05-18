/**
 * Routing Policies Page Server
 *
 * Charlie-preferred read path (variant 7) when the SF→Charlie chain
 * is healthy + `CHARLIE_DATA_SOURCE` includes `routing-policies`.
 * Falls back to the SF-SOQL repository on any Charlie-side failure.
 *
 * Charlie's routing-policy resolvers map to Sapien's `/dial-plan/policy-
 * destination-number` family. Mutation paths exist on Charlie too but
 * the visual-flow body shape is the standalone-avs editor's
 * React-Flow render model — that part stays SF-side.
 */

import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { createAdapterContext, getRepositories } from '$lib/adapters';
import {
  CharlieOperations,
  projectCharlieRoutingPolicy,
  projectConnectionPagination,
  tryGetCharlieClient,
  type CharlieConnection,
} from '$lib/charlie';
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

  const params = parseQueryParams(url);

  // Charlie-preferred read path. See `/users/+page.server.ts` for the
  // canonical comment on what this gate evaluates.
  const charlie = tryGetCharlieClient(locals, 'routing-policies');
  if (charlie) {
    try {
      const data = await charlie.request<{
        listRoutingPolicies: CharlieConnection<Parameters<typeof projectCharlieRoutingPolicy>[0]>;
      }>(CharlieOperations.ListRoutingPoliciesQuery, {
        input: {
          limit: params.pageSize,
          ...(params.search != null && { filter: { search: params.search } }),
        },
      });
      const conn = data.listRoutingPolicies;
      return {
        policies: conn.items.map(projectCharlieRoutingPolicy),
        pagination: projectConnectionPagination(conn, params.page, params.pageSize),
        isDemo: ctx.platform === 'demo',
      };
    } catch (err) {
      console.warn(
        '[charlie/routing-policies] data-plane query failed — falling back to SF SOQL:',
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  try {
    const { routingPolicies: policyRepo } = getRepositories(ctx);
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
      return fail(500, {
        error: error instanceof Error ? error.message : 'Failed to delete policy',
      });
    }
  },
};
