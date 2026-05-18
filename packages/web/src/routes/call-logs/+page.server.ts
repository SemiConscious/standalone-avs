/**
 * Call Logs Page Server
 *
 * Charlie-preferred read path (variant 7) when the SF→Charlie chain
 * is healthy + `CHARLIE_DATA_SOURCE` includes `call-logs`. Falls
 * back to the SF-SOQL repository on any Charlie-side failure.
 *
 * Charlie's `Query.listCallLogs` was the proof-of-life resolver in
 * Phase B.2 — backed by Sapien's `/log/call?user-id=…&_limit=…` via
 * `SapienCallLogRepository`.
 */

import type { PageServerLoad } from './$types';
import { createAdapterContext, getRepositories } from '$lib/adapters';
import {
  CharlieOperations,
  projectCharlieCallLog,
  projectConnectionPagination,
  type CharlieConnection,
} from '$lib/charlie';
import { tryGetCharlieClient } from '$lib/charlie/server';
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
    filters: direction
      ? { direction: [direction] as ('inbound' | 'outbound' | 'internal')[] }
      : undefined,
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

  const params = parseQueryParams(url);

  // Charlie-preferred read path. See `/users/+page.server.ts` for the
  // canonical comment on what this gate evaluates.
  const charlie = tryGetCharlieClient(locals, 'call-logs');
  if (charlie) {
    try {
      const data = await charlie.request<{
        listCallLogs: CharlieConnection<Parameters<typeof projectCharlieCallLog>[0]>;
      }>(CharlieOperations.ListCallLogsQuery, {
        input: {
          limit: params.pageSize,
          // Charlie's CallLogFilterInput.direction is uppercase enum
          // (INBOUND/OUTBOUND/INTERNAL); the page-server's
          // params.filters.direction is lowercase. Map on the way in.
          ...(params.filters?.direction?.[0] && {
            filter: { direction: params.filters.direction[0].toUpperCase() },
          }),
        },
      });
      const conn = data.listCallLogs;
      return {
        callLogs: conn.items.map(projectCharlieCallLog),
        pagination: projectConnectionPagination(conn, params.page, params.pageSize),
        isDemo: ctx.platform === 'demo',
        canPlayRecordings,
      };
    } catch (err) {
      console.warn(
        '[charlie/call-logs] data-plane query failed — falling back to SF SOQL:',
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  try {
    const { callLogs: callLogRepo } = getRepositories(ctx);
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
