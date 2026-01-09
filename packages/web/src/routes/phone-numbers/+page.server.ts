/**
 * Phone Numbers List Page Server
 * 
 * Refactored to use the platform-agnostic repository pattern.
 */

import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { createAdapterContext, getRepositories } from '$lib/adapters';
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
