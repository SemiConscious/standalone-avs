/**
 * Call Logs Page Server
 * 
 * Uses repository pattern for platform-agnostic data loading.
 */

import type { PageServerLoad } from './$types';
import { createAdapterContext, getRepositories } from '$lib/adapters';
import type { CallLog, PaginationMeta } from '$lib/domain';
import { getSapienConfig } from '$lib/server/sapien';

export type { CallLog };

export interface CallLogsPageData {
  callLogs: CallLog[];
  pagination: PaginationMeta;
  isDemo: boolean;
  canPlayRecordings: boolean;
  error?: string;
}

function parseQueryParams(url: URL) {
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '50', 10);
  const sortBy = url.searchParams.get('sortBy') || 'timestamp';
  const sortOrder = (url.searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
  const search = url.searchParams.get('search') || undefined;
  const direction = url.searchParams.get('direction') || undefined;

  return {
    page: Math.max(1, page),
    pageSize: Math.min(100, Math.max(1, pageSize)),
    sortBy,
    sortOrder,
    search,
    filters: direction ? { direction: [direction] as ('inbound' | 'outbound' | 'internal')[] } : undefined,
  };
}

export const load: PageServerLoad<CallLogsPageData> = async ({ locals, url }) => {
  // Check if recordings can be played (Sapien API is configured)
  const sapienConfig = getSapienConfig();
  const canPlayRecordings = Boolean(sapienConfig.host);

  let ctx;
  try {
    ctx = createAdapterContext(locals);
  } catch {
    return {
      callLogs: [],
      pagination: {
        page: 1,
        pageSize: 50,
        totalItems: 0,
        totalPages: 0,
        hasPreviousPage: false,
        hasNextPage: false,
      },
      isDemo: false,
      canPlayRecordings,
      error: 'Not authenticated',
    };
  }

  try {
    const { callLogs: callLogRepo } = getRepositories(ctx);
    const params = parseQueryParams(url);
    const result = await callLogRepo.findAll(params);

    return {
      callLogs: result.items,
      pagination: result.pagination,
      isDemo: ctx.platform === 'demo',
      canPlayRecordings,
    };
  } catch (error) {
    console.error('Failed to fetch call logs:', error);
    return {
      callLogs: [],
      pagination: {
        page: 1,
        pageSize: 50,
        totalItems: 0,
        totalPages: 0,
        hasPreviousPage: false,
        hasNextPage: false,
      },
      isDemo: ctx.platform === 'demo',
      canPlayRecordings,
      error: error instanceof Error ? error.message : 'Failed to load call logs',
    };
  }
};
