import { querySalesforce, hasValidCredentials } from '$lib/server/salesforce';
import { getSapienConfig, getSapienJwt, canGetSapienJwt } from '$lib/server/sapien';
import { env } from '$env/dynamic/private';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

interface SalesforceWallboard {
  Id: string;
  Name: string;
  nbavs__Description__c: string;
  nbavs__WidgetCount__c: number;
  nbavs__IsPublic__c: boolean;
  LastModifiedDate: string;
  CreatedById: string;
  CreatedBy?: { Id: string; Name: string };
}

export interface Wallboard {
  id: string;
  name: string;
  description: string;
  widgetCount: number;
  isPublic: boolean;
  lastModified: string;
  createdByName: string;
}

export interface WallboardsPageData {
  wallboards: Wallboard[];
  isDemo: boolean;
  totalCount: number;
  canShowLiveData: boolean;
  error?: string;
}

// Demo data
const DEMO_WALLBOARDS: Wallboard[] = [
  {
    id: '1',
    name: 'Support Team',
    description: 'Real-time metrics for support queue',
    widgetCount: 4,
    isPublic: true,
    lastModified: '2026-01-05T14:30:00Z',
    createdByName: 'John Smith',
  },
  {
    id: '2',
    name: 'Sales Overview',
    description: 'Sales team performance dashboard',
    widgetCount: 6,
    isPublic: true,
    lastModified: '2026-01-05T12:00:00Z',
    createdByName: 'Jane Doe',
  },
  {
    id: '3',
    name: 'Contact Center',
    description: 'Overall contact center metrics',
    widgetCount: 8,
    isPublic: false,
    lastModified: '2026-01-04T16:45:00Z',
    createdByName: 'Bob Johnson',
  },
];

export const load: PageServerLoad = async ({ locals }) => {
  // Check if we can show live data (Sapien API configured)
  const sapienHost = env.SAPIEN_HOST;
  let canShowLiveData = false;
  
  // If Sapien host is configured and we have Salesforce auth, try to verify Sapien access
  if (sapienHost && canGetSapienJwt(locals)) {
    try {
      // Get the JWT to verify we can access Sapien and extract org ID
      await getSapienJwt(
        locals.instanceUrl!,
        locals.accessToken!,
        'enduser:basic'
      );
      // If we got here, we can access Sapien
      const sapienConfig = getSapienConfig();
      canShowLiveData = !!sapienConfig.organizationId;
    } catch (e) {
      console.warn('Could not verify Sapien access for wallboards:', e);
      canShowLiveData = false;
    }
  }

  // Demo mode
  if (env.PUBLIC_DEMO_MODE === 'true' || env.PUBLIC_DEMO_MODE === '1') {
    return {
      wallboards: DEMO_WALLBOARDS,
      isDemo: true,
      totalCount: DEMO_WALLBOARDS.length,
      canShowLiveData: false,
    } satisfies WallboardsPageData;
  }

  // Check credentials
  if (!hasValidCredentials(locals)) {
    return {
      wallboards: [],
      isDemo: false,
      totalCount: 0,
      canShowLiveData: false,
      error: 'Not authenticated',
    } satisfies WallboardsPageData;
  }

  try {
    // Try to fetch wallboard data (object may not exist in all orgs)
    let wallboards: Wallboard[] = [];

    try {
      const wallboardSoql = `
        SELECT Id, Name, nbavs__Description__c, nbavs__WidgetCount__c,
               nbavs__IsPublic__c, LastModifiedDate, CreatedById, CreatedBy.Name
        FROM nbavs__Wallboard__c
        ORDER BY LastModifiedDate DESC
        LIMIT 50
      `;

      const result = await querySalesforce<SalesforceWallboard>(
        locals.instanceUrl!,
        locals.accessToken!,
        wallboardSoql
      );

      wallboards = result.records.map((w) => ({
        id: w.Id,
        name: w.Name,
        description: w.nbavs__Description__c || '',
        widgetCount: w.nbavs__WidgetCount__c || 0,
        isPublic: w.nbavs__IsPublic__c || false,
        lastModified: w.LastModifiedDate,
        createdByName: w.CreatedBy?.Name || 'Unknown',
      }));

      return {
        wallboards,
        isDemo: false,
        totalCount: result.totalSize,
        canShowLiveData,
      } satisfies WallboardsPageData;
    } catch (e) {
      // Object may not exist
      console.warn('Wallboard data not available:', e);
      return {
        wallboards: [],
        isDemo: false,
        totalCount: 0,
        canShowLiveData,
      } satisfies WallboardsPageData;
    }
  } catch (error) {
    console.error('Failed to fetch wallboards:', error);
    return {
      wallboards: [],
      isDemo: false,
      totalCount: 0,
      canShowLiveData,
      error: 'Failed to load wallboards',
    } satisfies WallboardsPageData;
  }
};

export const actions: Actions = {
  delete: async ({ locals, request }) => {
    if (!hasValidCredentials(locals)) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const wallboardId = formData.get('wallboardId') as string;

    if (!wallboardId) {
      return fail(400, { error: 'Wallboard ID is required' });
    }

    // In a real implementation, this would delete the wallboard
    return { success: true, message: 'Wallboard deleted successfully' };
  },
};
