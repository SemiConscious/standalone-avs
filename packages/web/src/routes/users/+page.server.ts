import { querySalesforce, hasValidCredentials } from '$lib/server/salesforce';
import { env } from '$env/dynamic/private';
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

export interface User {
  id: string;
  sapienId: number;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  extension: string;
  mobilePhone: string;
  status: 'active' | 'inactive' | 'suspended';
  enabled: boolean;
  // License flags
  licenses: {
    cti: boolean;
    pbx: boolean;
    manager: boolean;
    record: boolean;
    pci: boolean;
    scv: boolean;
    sms: boolean;
    whatsApp: boolean;
    insights: boolean;
    freedom: boolean;
  };
  permissionLevel: string;
  trackOutboundCTIDevice: boolean;
  availabilityProfile?: string;
  availabilityState?: string;
  linkedSalesforceUser?: { name: string; email: string };
  groups: string[];
}

// Demo data
const DEMO_USERS: User[] = [
  {
    id: 'u001',
    sapienId: 12345,
    name: 'John Smith',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@natterbox.com',
    username: 'john.smith@natterbox.com',
    extension: '2001',
    mobilePhone: '+447123456789',
    status: 'active',
    enabled: true,
    licenses: { cti: true, pbx: true, manager: true, record: true, pci: false, scv: false, sms: true, whatsApp: false, insights: true, freedom: false },
    permissionLevel: 'Admin',
    trackOutboundCTIDevice: true,
    availabilityProfile: 'Support Level 2',
    availabilityState: 'Available',
    linkedSalesforceUser: { name: 'John Smith', email: 'john.smith@company.com' },
    groups: ['Sales Team', 'UK Support'],
  },
  {
    id: 'u002',
    sapienId: 12346,
    name: 'Jane Doe',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@natterbox.com',
    username: 'jane.doe@natterbox.com',
    extension: '2002',
    mobilePhone: '+447987654321',
    status: 'active',
    enabled: true,
    licenses: { cti: true, pbx: true, manager: false, record: true, pci: false, scv: true, sms: true, whatsApp: true, insights: true, freedom: false },
    permissionLevel: 'Team Leader',
    trackOutboundCTIDevice: false,
    availabilityProfile: 'Default',
    availabilityState: 'Busy',
    linkedSalesforceUser: { name: 'Jane Doe', email: 'jane.doe@company.com' },
    groups: ['Support Team'],
  },
  {
    id: 'u003',
    sapienId: 12347,
    name: 'Bob Johnson',
    firstName: 'Bob',
    lastName: 'Johnson',
    email: 'bob.johnson@natterbox.com',
    username: 'bob.johnson@natterbox.com',
    extension: '2003',
    mobilePhone: '',
    status: 'inactive',
    enabled: false,
    licenses: { cti: false, pbx: false, manager: false, record: false, pci: false, scv: false, sms: false, whatsApp: false, insights: false, freedom: false },
    permissionLevel: 'Basic',
    trackOutboundCTIDevice: false,
    linkedSalesforceUser: { name: 'Bob Johnson', email: 'bob.johnson@company.com' },
    groups: [],
  },
  {
    id: 'u004',
    sapienId: 12348,
    name: 'Alice Williams',
    firstName: 'Alice',
    lastName: 'Williams',
    email: 'alice.williams@natterbox.com',
    username: 'alice.williams@natterbox.com',
    extension: '2004',
    mobilePhone: '+447555123456',
    status: 'active',
    enabled: true,
    licenses: { cti: true, pbx: true, manager: false, record: false, pci: false, scv: false, sms: false, whatsApp: false, insights: false, freedom: true },
    permissionLevel: 'Basic',
    trackOutboundCTIDevice: true,
    availabilityProfile: 'Platform Support',
    availabilityState: 'Available',
    linkedSalesforceUser: { name: 'Alice Williams', email: 'alice.williams@company.com' },
    groups: ['US Sales'],
  },
];

function mapStatus(sfUser: SalesforceUser): User['status'] {
  if (!sfUser.nbavs__Enabled__c) return 'inactive';
  if (sfUser.nbavs__Status__c === 'SUSPENDED') return 'suspended';
  return 'active';
}

export const load: PageServerLoad = async ({ locals }) => {
  // Demo mode
  if (env.PUBLIC_DEMO_MODE === 'true' || env.PUBLIC_DEMO_MODE === '1') {
    return { users: DEMO_USERS, isDemo: true, totalCount: DEMO_USERS.length };
  }

  // Check credentials
  if (!hasValidCredentials(locals)) {
    return { users: [], isDemo: false, totalCount: 0, error: 'Not authenticated' };
  }

  try {
    // Fetch users
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
      ORDER BY Name
      LIMIT 2000
    `;

    const usersResult = await querySalesforce<SalesforceUser>(
      locals.instanceUrl!,
      locals.accessToken!,
      userSoql
    );

    // Get group memberships for all users
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

    return { users, isDemo: false, totalCount: usersResult.totalSize };
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return { users: [], isDemo: false, totalCount: 0, error: 'Failed to load users' };
  }
};
