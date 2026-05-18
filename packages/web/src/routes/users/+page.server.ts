/**
 * Users List Page Server
 *
 * Read path is Charlie-preferred (variant 7 data plane) when the
 * SF→Charlie token-exchange chain is healthy + `CHARLIE_DATA_SOURCE`
 * includes `users`. Falls back to the SF-SOQL repository on any
 * Charlie-side failure so the page never goes blank because of a
 * Charlie outage. See `lib/charlie/server.ts` for the gate.
 *
 * Mutations (form actions) still go to the SF-SOQL repository — Charlie
 * exposes the SDL for `createUser`/`updateUser`/`deleteUser` but the
 * resolvers throw `NOT_IMPLEMENTED` pending a Sapien-team conversation
 * about PATCH semantics on `/organisation/{orgId}/user/{userId}`.
 */

import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { createAdapterContext, getRepositories } from '$lib/adapters';
import {
  CharlieOperations,
  projectCharlieUser,
  projectConnectionPagination,
  type CharlieConnection,
} from '$lib/charlie';
import { tryGetCharlieClient } from '$lib/charlie/server';
import type { User, PaginationMeta } from '$lib/domain';

// Re-export User type for the page component
export type { User };

// =============================================================================
// Page Data Types
// =============================================================================

export interface UsersPageData {
  users: User[];
  pagination: PaginationMeta;
  isDemo: boolean;
  error?: string;
}

// =============================================================================
// Query Parameter Parsing
// =============================================================================

function parseQueryParams(url: URL) {
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '25', 10);
  const sortBy = url.searchParams.get('sortBy') || 'name';
  const sortOrder = (url.searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc';
  const search = url.searchParams.get('search') || undefined;
  const status = url.searchParams.get('status') as 'active' | 'inactive' | 'suspended' | undefined;

  return {
    page: Math.max(1, page),
    pageSize: Math.min(100, Math.max(1, pageSize)),
    sortBy,
    sortOrder,
    search,
    filters: status ? { status } : undefined,
  };
}

// =============================================================================
// Load Function
// =============================================================================

export const load: PageServerLoad<UsersPageData> = async ({ locals, url }) => {
  // Create adapter context - handles platform detection and auth
  let ctx;
  try {
    ctx = createAdapterContext(locals);
  } catch {
    // If context creation fails, return empty state with error
    return {
      users: [],
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

  const isDemo = ctx.platform === 'demo';
  const params = parseQueryParams(url);

  // Charlie-preferred read path. Returns null when the SF→Charlie
  // chain isn't healthy, the user wasn't opted in, or the env flag
  // doesn't allow it for the `users` domain.
  const charlie = tryGetCharlieClient(locals, 'users');
  if (charlie) {
    try {
      const data = await charlie.request<{
        listUsers: CharlieConnection<Parameters<typeof projectCharlieUser>[0]>;
      }>(CharlieOperations.ListUsersQuery, {
        input: {
          limit: params.pageSize,
          // The SvelteKit page tier sends page+pageSize; Charlie's
          // pagination is token-based. For the first cut we paginate
          // page 1 only — the existing UI doesn't pass through Charlie's
          // continuationToken yet. Adding token-based UI pagination is
          // a follow-up.
          ...(params.search != null && { filter: { search: params.search } }),
        },
      });
      const conn = data.listUsers;
      return {
        users: conn.items.map(projectCharlieUser),
        pagination: projectConnectionPagination(conn, params.page, params.pageSize),
        isDemo,
      };
    } catch (err) {
      console.warn(
        '[charlie/users] data-plane query failed — falling back to SF SOQL:',
        err instanceof Error ? err.message : String(err)
      );
      // Fall through to the SF path below.
    }
  }

  try {
    // Get repositories for the current platform
    const { users: userRepo } = getRepositories(ctx);

    // Fetch users using the repository
    const result = await userRepo.findAll(params);

    return {
      users: result.items,
      pagination: result.pagination,
      isDemo,
    };
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return {
      users: [],
      pagination: {
        page: 1,
        pageSize: 25,
        totalItems: 0,
        totalPages: 0,
        hasPreviousPage: false,
        hasNextPage: false,
      },
      isDemo,
      error: error instanceof Error ? error.message : 'Failed to load users',
    };
  }
};

// =============================================================================
// Actions
// =============================================================================

export const actions: Actions = {
  delete: async ({ locals, request }) => {
    let ctx;
    try {
      ctx = createAdapterContext(locals);
    } catch {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const userId = formData.get('userId')?.toString();

    if (!userId) {
      return fail(400, { error: 'User ID is required' });
    }

    try {
      const { users: userRepo } = getRepositories(ctx);
      const result = await userRepo.delete(userId);

      if (!result.success) {
        return fail(500, { error: result.error || 'Failed to delete user' });
      }

      return { success: true, message: 'User deleted successfully' };
    } catch (error) {
      console.error('Failed to delete user:', error);
      return fail(500, { error: error instanceof Error ? error.message : 'Failed to delete user' });
    }
  },
};
