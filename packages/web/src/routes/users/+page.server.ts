import { querySalesforce, hasValidCredentials } from '$lib/server/salesforce';
import {
  parsePaginationParams,
  buildSoqlOrderBy,
  buildSoqlPagination,
  buildSoqlSearch,
  combineSoqlConditions,
  buildPaginationMeta,
  paginateArray,
  createSearchFn,
  createSortFn,
  createFilterFn,
  type PaginationMeta,
} from '$lib/server/pagination';
import { isDemoMode, DEMO_USERS, type DemoUser } from '$lib/server/demo';
import type { PageServerLoad } from './$types';

interface SalesforceUser {
  Id: string;
  Name: string;
  nbavs__Id__c: number;
  nbavs__FirstName__c: string;
  nbavs__LastName__c: string;
  nbavs__Username__c: string;
  nbavs__SipExtension__c: string;
  nbavs__MobilePhone__c: string;
  nbavs__Status__c: string;
  nbavs__Enabled__c: boolean;
  nbavs__CTI__c: boolean;
  nbavs__PBX__c: boolean;
  nbavs__Manager__c: boolean;
  nbavs__Record__c: boolean;
  nbavs__PCI__c: boolean;
  nbavs__SCV__c: boolean;
  nbavs__SMS__c: boolean;
  nbavs__WhatsApp__c: boolean;
  nbavs__Insights__c: boolean;
  nbavs__Freedom__c: boolean;
  nbavs__PermissionLevel__c: string;
  nbavs__TrackOutboundCTIDevice__c: boolean;
  nbavs__AvailabilityProfile__r?: { Name: string };
  nbavs__AvailabilityProfileState__r?: { Name: string; nbavs__DisplayName__c: string };
  nbavs__User__r?: { Name: string; Email: string };
}

interface SalesforceGroupMember {
  nbavs__Group__r: { Id: string; Name: string };
}

// Re-export User type from centralized demo data
export type User = DemoUser;

function mapStatus(sfUser: SalesforceUser): User['status'] {
  if (!sfUser.nbavs__Enabled__c) return 'inactive';
  if (sfUser.nbavs__Status__c === 'SUSPENDED') return 'suspended';
  return 'active';
}

// Field mapping for sort (UI field name -> SOQL field name)
const SORT_FIELD_MAP: Record<string, string> = {
  name: 'Name',
  user: 'Name',
  extension: 'nbavs__SipExtension__c',
  status: 'nbavs__Enabled__c',
  permissionLevel: 'nbavs__PermissionLevel__c',
};

// Searchable fields for SOQL
const SEARCH_FIELDS = [
  'Name',
  'nbavs__Username__c',
  'nbavs__SipExtension__c',
  'nbavs__FirstName__c',
  'nbavs__LastName__c',
];

export const load: PageServerLoad = async ({ locals, url }) => {
  // Parse pagination params from URL
  const params = parsePaginationParams(url, {
    pageSize: 25,
    sortBy: 'name',
    sortOrder: 'asc',
  });

  // Demo mode - use in-memory pagination
  if (isDemoMode()) {
    const result = paginateArray(DEMO_USERS, params, {
      searchFn: createSearchFn(['name', 'email', 'username', 'extension']),
      sortFn: createSortFn(),
      filterFn: createFilterFn(['status', 'enabled']),
    });
    
    return {
      users: result.items,
      pagination: result.pagination,
      isDemo: true,
    };
  }

  // Check credentials
  if (!hasValidCredentials(locals)) {
    return {
      users: [],
      pagination: buildPaginationMeta(1, params.pageSize, 0),
      isDemo: false,
      error: 'Not authenticated',
    };
  }

  try {
    // Build WHERE conditions
    const conditions: string[] = [];
    
    // Search condition
    if (params.search) {
      const searchCondition = buildSoqlSearch(params.search, SEARCH_FIELDS);
      if (searchCondition) conditions.push(searchCondition);
    }
    
    // Status filter
    if (params.filters.status) {
      if (params.filters.status === 'active') {
        conditions.push('nbavs__Enabled__c = true');
      } else if (params.filters.status === 'inactive') {
        conditions.push('nbavs__Enabled__c = false');
      }
    }
    
    // Build complete WHERE clause
    const whereClause = combineSoqlConditions(conditions);
    
    // Get sort field for SOQL
    const soqlSortField = SORT_FIELD_MAP[params.sortBy || 'name'] || 'Name';
    const orderByClause = buildSoqlOrderBy(soqlSortField, params.sortOrder);
    const paginationClause = buildSoqlPagination(params.page, params.pageSize);
    
    // Count total records (for pagination meta)
    const countSoql = `SELECT COUNT() FROM nbavs__User__c ${whereClause}`;
    const countResult = await querySalesforce<Record<string, unknown>>(
      locals.instanceUrl!,
      locals.accessToken!,
      countSoql
    );
    const totalCount = countResult.totalSize;

    // Fetch users with pagination
    const userSoql = `
      SELECT Id, Name, nbavs__Id__c,
             nbavs__FirstName__c, nbavs__LastName__c, 
             nbavs__Username__c, nbavs__SipExtension__c, nbavs__MobilePhone__c,
             nbavs__Status__c, nbavs__Enabled__c,
             nbavs__CTI__c, nbavs__PBX__c, nbavs__Manager__c, nbavs__Record__c,
             nbavs__PCI__c, nbavs__SCV__c, nbavs__SMS__c, nbavs__WhatsApp__c,
             nbavs__Insights__c, nbavs__Freedom__c, nbavs__PermissionLevel__c,
             nbavs__TrackOutboundCTIDevice__c,
             nbavs__AvailabilityProfile__r.Name,
             nbavs__AvailabilityProfileState__r.Name,
             nbavs__AvailabilityProfileState__r.nbavs__DisplayName__c,
             nbavs__User__r.Name, nbavs__User__r.Email
      FROM nbavs__User__c
      ${whereClause}
      ${orderByClause}
      ${paginationClause}
    `;

    const usersResult = await querySalesforce<SalesforceUser>(
      locals.instanceUrl!,
      locals.accessToken!,
      userSoql
    );

    // Get group memberships for the fetched users only
    const userIds = usersResult.records.map((u) => `'${u.Id}'`).join(',');
    let groupMemberships: Map<string, string[]> = new Map();

    if (userIds.length > 0) {
      try {
        const groupSoql = `
          SELECT nbavs__User__c, nbavs__Group__r.Name
          FROM nbavs__GroupMember__c
          WHERE nbavs__User__c IN (${userIds})
        `;
        const groupsResult = await querySalesforce<{ nbavs__User__c: string; nbavs__Group__r: { Name: string } }>(
          locals.instanceUrl!,
          locals.accessToken!,
          groupSoql
        );

        for (const gm of groupsResult.records) {
          const userId = gm.nbavs__User__c;
          if (!groupMemberships.has(userId)) {
            groupMemberships.set(userId, []);
          }
          groupMemberships.get(userId)!.push(gm.nbavs__Group__r?.Name || 'Unknown');
        }
      } catch (e) {
        console.warn('Failed to fetch group memberships:', e);
      }
    }

    const users: User[] = usersResult.records.map((sfUser) => ({
      id: sfUser.Id,
      sapienId: sfUser.nbavs__Id__c || 0,
      name: sfUser.Name || `${sfUser.nbavs__FirstName__c || ''} ${sfUser.nbavs__LastName__c || ''}`.trim(),
      firstName: sfUser.nbavs__FirstName__c || '',
      lastName: sfUser.nbavs__LastName__c || '',
      email: sfUser.nbavs__User__r?.Email || sfUser.nbavs__Username__c || '',
      username: sfUser.nbavs__Username__c || '',
      extension: sfUser.nbavs__SipExtension__c || '',
      mobilePhone: sfUser.nbavs__MobilePhone__c || '',
      status: mapStatus(sfUser),
      enabled: sfUser.nbavs__Enabled__c || false,
      licenses: {
        cti: sfUser.nbavs__CTI__c || false,
        pbx: sfUser.nbavs__PBX__c || false,
        manager: sfUser.nbavs__Manager__c || false,
        record: sfUser.nbavs__Record__c || false,
        pci: sfUser.nbavs__PCI__c || false,
        scv: sfUser.nbavs__SCV__c || false,
        sms: sfUser.nbavs__SMS__c || false,
        whatsApp: sfUser.nbavs__WhatsApp__c || false,
        insights: sfUser.nbavs__Insights__c || false,
        freedom: sfUser.nbavs__Freedom__c || false,
      },
      permissionLevel: sfUser.nbavs__PermissionLevel__c || 'Basic',
      trackOutboundCTIDevice: sfUser.nbavs__TrackOutboundCTIDevice__c || false,
      availabilityProfile: sfUser.nbavs__AvailabilityProfile__r?.Name,
      availabilityState: sfUser.nbavs__AvailabilityProfileState__r?.nbavs__DisplayName__c ||
        sfUser.nbavs__AvailabilityProfileState__r?.Name,
      linkedSalesforceUser: sfUser.nbavs__User__r
        ? { name: sfUser.nbavs__User__r.Name, email: sfUser.nbavs__User__r.Email }
        : undefined,
      groups: groupMemberships.get(sfUser.Id) || [],
    }));

    return {
      users,
      pagination: buildPaginationMeta(params.page, params.pageSize, totalCount),
      isDemo: false,
    };
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return {
      users: [],
      pagination: buildPaginationMeta(1, params.pageSize, 0),
      isDemo: false,
      error: 'Failed to load users',
    };
  }
};
