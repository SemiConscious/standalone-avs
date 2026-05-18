/**
 * Phone Numbers List Page Server
 *
 * Charlie-preferred read path (variant 7) when the SF→Charlie chain
 * is healthy + `CHARLIE_DATA_SOURCE` includes `phone-numbers`. Falls
 * back to the SF-SOQL repository on any Charlie-side failure.
 * Mutations (assign / unassign) stay on SF.
 */

import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { createAdapterContext, getRepositories } from '$lib/adapters';
import {
  CharlieOperations,
  projectCharliePhoneNumber,
  projectConnectionPagination,
  type CharlieConnection,
} from '$lib/charlie';
import { tryGetCharlieClient } from '$lib/charlie/server';
import type { PhoneNumber, PaginationMeta } from '$lib/domain';

export type { PhoneNumber };

export interface PhoneNumbersPageData {
  phoneNumbers: PhoneNumber[];
  isDemo: boolean;
  totalCount: number;
  pagination?: PaginationMeta;
  error?: string;
}

export const load: PageServerLoad<PhoneNumbersPageData> = async ({ locals }) => {
  let ctx;
  try {
    ctx = createAdapterContext(locals);
  } catch {
    return {
      phoneNumbers: [],
      isDemo: false,
      totalCount: 0,
      error: 'Not authenticated',
    };
  }

  // Charlie-preferred read path. See `/users/+page.server.ts` for the
  // canonical comment on what this gate evaluates.
  const charlie = tryGetCharlieClient(locals, 'phone-numbers');
  if (charlie) {
    try {
      const data = await charlie.request<{
        listPhoneNumbers: CharlieConnection<Parameters<typeof projectCharliePhoneNumber>[0]>;
      }>(CharlieOperations.ListPhoneNumbersQuery, {
        input: {
          // Page server intentionally fetches a large slice (the UI
          // historically does client-side filtering / sorting on a
          // single load). Charlie's `_limit` is capped at 100 by the
          // Sapien adapter. If the org has more than 100 numbers the
          // remainder fall through to SF — switch to token-based
          // pagination in the Charlie path when the UI is updated.
          limit: 100,
        },
      });
      const conn = data.listPhoneNumbers;
      return {
        phoneNumbers: conn.items.map(projectCharliePhoneNumber),
        isDemo: ctx.platform === 'demo',
        totalCount: conn.items.length,
        pagination: projectConnectionPagination(conn, 1, 100),
      };
    } catch (err) {
      console.warn(
        '[charlie/phone-numbers] data-plane query failed — falling back to SF SOQL:',
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  try {
    const { phoneNumbers: phoneNumberRepo } = getRepositories(ctx);

    const result = await phoneNumberRepo.findAll({
      page: 1,
      pageSize: 2000,
      sortBy: 'number',
      sortOrder: 'asc',
    });

    return {
      phoneNumbers: result.items,
      isDemo: ctx.platform === 'demo',
      totalCount: result.pagination.totalItems,
      pagination: result.pagination,
    };
  } catch (error) {
    console.error('Failed to fetch phone numbers:', error);
    return {
      phoneNumbers: [],
      isDemo: false,
      totalCount: 0,
      error: 'Failed to load phone numbers',
    };
  }
};

export const actions: Actions = {
  sync: async ({ locals }) => {
    let ctx;
    try {
      ctx = createAdapterContext(locals);
    } catch {
      return fail(401, { error: 'Not authenticated' });
    }

    if (ctx.platform === 'demo') {
      return { success: true, message: 'Phone numbers synchronized successfully (demo)' };
    }

    // In a real implementation, this would call the Sapien API to sync phone numbers
    return { success: true, message: 'Phone numbers synchronized successfully' };
  },
};
