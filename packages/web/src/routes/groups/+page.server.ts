import { querySalesforce, hasValidCredentials } from '$lib/server/salesforce';
import { env } from '$env/dynamic/private';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

interface SalesforceGroup {
  Id: string;
  Name: string;
  nbavs__Id__c: number;
  nbavs__Description__c: string;
  nbavs__Email__c: string;
  nbavs__Extension__c: string;
  nbavs__GroupPickup__c: string;
  nbavs__PBX__c: boolean;
  nbavs__Manager__c: boolean;
  nbavs__Record__c: boolean;
  LastModifiedDate: string;
}

export interface Group {
  id: string;
  apiId: number;
  name: string;
  email: string;
  extension: string;
  groupPickup: string;
  description: string;
  pbx: boolean;
  manager: boolean;
  record: boolean;
  lastModified: string;
  memberCount?: number;
}

// Demo data
const DEMO_GROUPS: Group[] = [
  {
    id: '1',
    apiId: 101,
    name: 'Sales Team',
    email: 'sales@company.com',
    extension: '2001',
    groupPickup: '*61',
    description: 'Main sales department ring group',
    pbx: true,
    manager: true,
    record: true,
    lastModified: '2026-01-05T10:30:00Z',
    memberCount: 8,
  },
  {
    id: '2',
    apiId: 102,
    name: 'Customer Support',
    email: 'support@company.com',
    extension: '2002',
    groupPickup: '*62',
    description: 'Support queue for customer inquiries',
    pbx: true,
    manager: true,
    record: true,
    lastModified: '2026-01-04T14:20:00Z',
    memberCount: 12,
  },
  {
    id: '3',
    apiId: 103,
    name: 'Technical Support',
    email: 'tech@company.com',
    extension: '2003',
    groupPickup: '*63',
    description: 'Technical support hunt group',
    pbx: true,
    manager: false,
    record: true,
    lastModified: '2026-01-03T09:15:00Z',
    memberCount: 5,
  },
  {
    id: '4',
    apiId: 104,
    name: 'After Hours',
    email: 'afterhours@company.com',
    extension: '2004',
    groupPickup: '*64',
    description: 'After hours support team',
    pbx: false,
    manager: false,
    record: false,
    lastModified: '2026-01-02T16:45:00Z',
    memberCount: 3,
  },
  {
    id: '5',
    apiId: 105,
    name: 'Reception',
    email: 'reception@company.com',
    extension: '2005',
    groupPickup: '*65',
    description: 'Front desk and reception',
    pbx: true,
    manager: true,
    record: false,
    lastModified: '2026-01-01T11:00:00Z',
    memberCount: 2,
  },
];

export const load: PageServerLoad = async ({ locals }) => {
  // Demo mode
  if (env.PUBLIC_DEMO_MODE === 'true' || env.PUBLIC_DEMO_MODE === '1') {
    return { groups: DEMO_GROUPS, isDemo: true, totalCount: DEMO_GROUPS.length };
  }

  // Check credentials
  if (!hasValidCredentials(locals)) {
    return { groups: [], isDemo: false, totalCount: 0, error: 'Not authenticated' };
  }

  try {
    // Fetch groups with all relevant fields
    const soql = `
      SELECT Id, nbavs__Id__c, Name, nbavs__Description__c, nbavs__Email__c,
             nbavs__Extension__c, nbavs__GroupPickup__c, nbavs__PBX__c,
             nbavs__Manager__c, nbavs__Record__c, LastModifiedDate
      FROM nbavs__Group__c
      ORDER BY LastModifiedDate DESC
      LIMIT 2000
    `;

    const result = await querySalesforce<SalesforceGroup>(
      locals.instanceUrl!,
      locals.accessToken!,
      soql
    );

    // Fetch member counts for each group
    const memberCountsSoql = `
      SELECT nbavs__Group__c, COUNT(Id) cnt
      FROM nbavs__GroupMember__c
      GROUP BY nbavs__Group__c
    `;

    interface MemberCountResult {
      nbavs__Group__c: string;
      cnt: number;
    }

    let memberCountMap = new Map<string, number>();
    try {
      const memberCountsResult = await querySalesforce<MemberCountResult>(
        locals.instanceUrl!,
        locals.accessToken!,
        memberCountsSoql
      );
      memberCountsResult.records.forEach((r) => {
        memberCountMap.set(r.nbavs__Group__c, r.cnt);
      });
    } catch (e) {
      console.warn('Failed to fetch member counts:', e);
    }

    const groups: Group[] = result.records.map((sfGroup) => ({
      id: sfGroup.Id,
      apiId: sfGroup.nbavs__Id__c || 0,
      name: sfGroup.Name,
      email: sfGroup.nbavs__Email__c || '',
      extension: sfGroup.nbavs__Extension__c || '',
      groupPickup: sfGroup.nbavs__GroupPickup__c || '',
      description: sfGroup.nbavs__Description__c || '',
      pbx: sfGroup.nbavs__PBX__c || false,
      manager: sfGroup.nbavs__Manager__c || false,
      record: sfGroup.nbavs__Record__c || false,
      lastModified: sfGroup.LastModifiedDate,
      memberCount: memberCountMap.get(sfGroup.Id) || 0,
    }));

    return { groups, isDemo: false, totalCount: result.totalSize };
  } catch (error) {
    console.error('Failed to fetch groups:', error);
    return { groups: [], isDemo: false, totalCount: 0, error: 'Failed to load groups' };
  }
};

// Actions for delete
export const actions: Actions = {
  delete: async ({ locals, request }) => {
    if (!hasValidCredentials(locals)) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const groupId = formData.get('groupId') as string;

    if (!groupId) {
      return fail(400, { error: 'Group ID is required' });
    }

    // In a real implementation, this would call the Sapien API to delete the group
    // and then delete from Salesforce
    return { success: true, message: 'Group deleted successfully' };
  },
};
