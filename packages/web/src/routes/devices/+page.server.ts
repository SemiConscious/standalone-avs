/**
 * Devices List Page Server
 *
 * Charlie-preferred read path (variant 7) when the SF→Charlie chain
 * is healthy + `CHARLIE_DATA_SOURCE` includes `devices`. Falls back
 * to the SF-SOQL repository on any Charlie-side failure. Mutations
 * stay on SF — Charlie's device PATCH semantics aren't yet
 * documented Sapien-side.
 */

import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { createAdapterContext, getRepositories } from '$lib/adapters';
import {
  CharlieOperations,
  projectCharlieDevice,
  projectConnectionPagination,
  type CharlieConnection,
} from '$lib/charlie';
import { tryGetCharlieClient } from '$lib/charlie/server';
import type { Device, PaginationMeta } from '$lib/domain';

export type { Device };

export interface DevicesPageData {
  devices: Device[];
  pagination: PaginationMeta;
  isDemo: boolean;
  error?: string;
}

function parseQueryParams(url: URL) {
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '25', 10);
  const sortBy = url.searchParams.get('sortBy') || 'extension';
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

export const load: PageServerLoad<DevicesPageData> = async ({ locals, url }) => {
  let ctx;
  try {
    ctx = createAdapterContext(locals);
  } catch {
    return {
      devices: [],
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
  const charlie = tryGetCharlieClient(locals, 'devices');
  if (charlie) {
    try {
      const data = await charlie.request<{
        listDevices: CharlieConnection<Parameters<typeof projectCharlieDevice>[0]>;
      }>(CharlieOperations.ListDevicesQuery, {
        input: {
          limit: params.pageSize,
          ...(params.search != null && { filter: { search: params.search } }),
        },
      });
      const conn = data.listDevices;
      return {
        devices: conn.items.map(projectCharlieDevice),
        pagination: projectConnectionPagination(conn, params.page, params.pageSize),
        isDemo: ctx.platform === 'demo',
      };
    } catch (err) {
      console.warn(
        '[charlie/devices] data-plane query failed — falling back to SF SOQL:',
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  try {
    const { devices: deviceRepo } = getRepositories(ctx);
    const result = await deviceRepo.findAll(params);

    return {
      devices: result.items,
      pagination: result.pagination,
      isDemo: ctx.platform === 'demo',
    };
  } catch (error) {
    console.error('Failed to fetch devices:', error);
    return {
      devices: [],
      pagination: {
        page: 1,
        pageSize: 25,
        totalItems: 0,
        totalPages: 0,
        hasPreviousPage: false,
        hasNextPage: false,
      },
      isDemo: ctx.platform === 'demo',
      error: error instanceof Error ? error.message : 'Failed to load devices',
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
    const deviceId = formData.get('deviceId')?.toString();

    if (!deviceId) {
      return fail(400, { error: 'Device ID is required' });
    }

    try {
      const { devices: deviceRepo } = getRepositories(ctx);
      const result = await deviceRepo.delete(deviceId);

      if (!result.success) {
        return fail(500, { error: result.error || 'Failed to delete device' });
      }

      return { success: true, message: 'Device deleted successfully' };
    } catch (error) {
      return fail(500, {
        error: error instanceof Error ? error.message : 'Failed to delete device',
      });
    }
  },
};
