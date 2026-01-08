import type { PageServerLoad, Actions } from './$types';
import { hasValidCredentials, querySalesforce, updateSalesforce } from '$lib/server/salesforce';
import { sapienRequest } from '$lib/server/sapien';
import { 
  canUseSapienApi, 
  getSapienAccessToken, 
  getSapienHost, 
  getOrganizationId 
} from '$lib/server/gatekeeper';
import { getOrganizationLicenses, validateUserLicenses, type OrganizationLicenses } from '$lib/server/license';
import { env } from '$env/dynamic/private';
import { error, fail } from '@sveltejs/kit';
import type { User } from '../+page.server';

const NAMESPACE = env.SALESFORCE_PACKAGE_NAMESPACE || 'nbavs';

// Extension validation constants
const EXTENSION_MIN = 1000;
const EXTENSION_MAX = 9999;

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
  nbavs__AvailabilityProfile__c?: string;
  nbavs__AvailabilityProfile__r?: { Id: string; Name: string };
  nbavs__AvailabilityProfileState__r?: { Name: string; nbavs__DisplayName__c: string };
  nbavs__User__r?: { Id: string; Name: string; Email: string };
  nbavs__User__c?: string;
}

interface AvailabilityProfile {
  id: string;
  name: string;
}

interface SalesforceSystemUser {
  Id: string;
  Name: string;
  Email: string;
}

// Demo data
const DEMO_USER: User = {
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
};

const DEMO_LICENSE_STATUS = {
  enabled: true,
  limit: 100,
  used: 45,
  available: 55,
  percentUsed: 45,
};

const DEMO_ORG_LICENSES: OrganizationLicenses = {
  pbx: DEMO_LICENSE_STATUS,
  cti: DEMO_LICENSE_STATUS,
  manager: { ...DEMO_LICENSE_STATUS, used: 10, available: 90, percentUsed: 10 },
  record: { ...DEMO_LICENSE_STATUS, used: 30, available: 70, percentUsed: 30 },
  sms: { ...DEMO_LICENSE_STATUS, limit: 50, used: 20, available: 30, percentUsed: 40 },
  whatsApp: { enabled: false, limit: 0, used: 0, available: 0, percentUsed: 0 },
  insights: DEMO_LICENSE_STATUS,
  freedom: { enabled: false, limit: 0, used: 0, available: 0, percentUsed: 0 },
  pci: { enabled: false, limit: 0, used: 0, available: 0, percentUsed: 0 },
  scv: { enabled: false, limit: 0, used: 0, available: 0, percentUsed: 0 },
};

function mapStatus(sfUser: SalesforceUser): User['status'] {
  if (!sfUser.nbavs__Enabled__c) return 'inactive';
  if (sfUser.nbavs__Status__c === 'SUSPENDED') return 'suspended';
  return 'active';
}

export const load: PageServerLoad = async ({ params, locals }) => {
  const { id } = params;

  // Demo mode
  if (env.PUBLIC_DEMO_MODE === 'true' || env.PUBLIC_DEMO_MODE === '1') {
    return {
      user: { ...DEMO_USER, id },
      availabilityProfiles: [
        { id: 'ap1', name: 'Default' },
        { id: 'ap2', name: 'Support Level 2' },
        { id: 'ap3', name: 'Platform Support' },
      ],
      salesforceUsers: [
        { Id: 'sf1', Name: 'John Smith', Email: 'john.smith@company.com' },
        { Id: 'sf2', Name: 'Jane Doe', Email: 'jane.doe@company.com' },
      ],
      organizationLicenses: DEMO_ORG_LICENSES,
      isDemo: true,
      availabilityProfileId: 'ap2', // Demo: user has Support Level 2 profile
      linkedUserId: 'sf1', // Demo: linked to John Smith
    };
  }

  if (!hasValidCredentials(locals)) {
    return {
      user: null,
      availabilityProfiles: [],
      salesforceUsers: [],
      organizationLicenses: null,
      isDemo: false,
      error: 'Not authenticated',
      availabilityProfileId: '',
      linkedUserId: '',
    };
  }

  try {
    // Fetch organization licenses
    let organizationLicenses: OrganizationLicenses | null = null;
    try {
      organizationLicenses = await getOrganizationLicenses(locals.instanceUrl!, locals.accessToken!);
    } catch (e) {
      console.warn('Failed to fetch organization licenses:', e);
    }

    // Fetch user
    const userSoql = `
      SELECT Id, Name, ${NAMESPACE}__Id__c,
             ${NAMESPACE}__FirstName__c, ${NAMESPACE}__LastName__c, 
             ${NAMESPACE}__Username__c, ${NAMESPACE}__SipExtension__c, ${NAMESPACE}__MobilePhone__c,
             ${NAMESPACE}__Status__c, ${NAMESPACE}__Enabled__c,
             ${NAMESPACE}__CTI__c, ${NAMESPACE}__PBX__c, ${NAMESPACE}__Manager__c, ${NAMESPACE}__Record__c,
             ${NAMESPACE}__PCI__c, ${NAMESPACE}__SCV__c, ${NAMESPACE}__SMS__c, ${NAMESPACE}__WhatsApp__c,
             ${NAMESPACE}__Insights__c, ${NAMESPACE}__Freedom__c, ${NAMESPACE}__PermissionLevel__c,
             ${NAMESPACE}__TrackOutboundCTIDevice__c, ${NAMESPACE}__AvailabilityProfile__c,
             ${NAMESPACE}__AvailabilityProfile__r.Id, ${NAMESPACE}__AvailabilityProfile__r.Name,
             ${NAMESPACE}__AvailabilityProfileState__r.Name,
             ${NAMESPACE}__AvailabilityProfileState__r.${NAMESPACE}__DisplayName__c,
             ${NAMESPACE}__User__c, ${NAMESPACE}__User__r.Id, ${NAMESPACE}__User__r.Name, ${NAMESPACE}__User__r.Email
      FROM ${NAMESPACE}__User__c
      WHERE Id = '${id}'
      LIMIT 1
    `;

    const userResult = await querySalesforce<SalesforceUser>(
      locals.instanceUrl!,
      locals.accessToken!,
      userSoql
    );

    if (userResult.records.length === 0) {
      throw error(404, 'User not found');
    }

    const sfUser = userResult.records[0];

    // Fetch group memberships
    let groups: string[] = [];
    try {
      const groupSoql = `
        SELECT ${NAMESPACE}__Group__r.Name
        FROM ${NAMESPACE}__GroupMember__c
        WHERE ${NAMESPACE}__User__c = '${id}'
      `;
      const groupsResult = await querySalesforce<{ nbavs__Group__r: { Name: string } }>(
        locals.instanceUrl!,
        locals.accessToken!,
        groupSoql
      );
      groups = groupsResult.records.map(gm => gm.nbavs__Group__r?.Name || 'Unknown');
    } catch (e) {
      console.warn('Failed to fetch group memberships:', e);
    }

    // Fetch availability profiles
    let availabilityProfiles: AvailabilityProfile[] = [];
    try {
      const apSoql = `
        SELECT Id, Name
        FROM ${NAMESPACE}__AvailabilityProfile__c
        ORDER BY Name
        LIMIT 100
      `;
      const apResult = await querySalesforce<{ Id: string; Name: string }>(
        locals.instanceUrl!,
        locals.accessToken!,
        apSoql
      );
      availabilityProfiles = apResult.records.map(ap => ({
        id: ap.Id,
        name: ap.Name,
      }));
    } catch (e) {
      console.warn('Failed to fetch availability profiles:', e);
    }

    // Fetch Salesforce users for linking
    let salesforceUsers: SalesforceSystemUser[] = [];
    try {
      const sfUserSoql = `
        SELECT Id, Name, Email
        FROM User
        WHERE IsActive = true
        ORDER BY Name
        LIMIT 500
      `;
      const sfUserResult = await querySalesforce<SalesforceSystemUser>(
        locals.instanceUrl!,
        locals.accessToken!,
        sfUserSoql
      );
      salesforceUsers = sfUserResult.records;
    } catch (e) {
      console.warn('Failed to fetch Salesforce users:', e);
    }

    const user: User = {
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
      groups,
    };

    return {
      user,
      availabilityProfiles,
      salesforceUsers,
      organizationLicenses,
      isDemo: false,
      // Include IDs for form initialization
      availabilityProfileId: sfUser.nbavs__AvailabilityProfile__c || '',
      linkedUserId: sfUser.nbavs__User__c || '',
    };
  } catch (e) {
    if ((e as { status?: number }).status === 404) throw e;
    console.error('Failed to load user:', e);
    return {
      user: null,
      availabilityProfiles: [],
      salesforceUsers: [],
      organizationLicenses: null,
      isDemo: false,
      error: e instanceof Error ? e.message : 'Failed to load user',
      availabilityProfileId: '',
      linkedUserId: '',
    };
  }
};

export const actions: Actions = {
  update: async ({ params, locals, request }) => {
    const { id } = params;

    if (!hasValidCredentials(locals)) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();

    // Extract form fields
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const extension = formData.get('extension') as string;
    const mobilePhone = formData.get('mobilePhone') as string;
    const enabled = formData.get('enabled') === 'true';
    const permissionLevel = formData.get('permissionLevel') as string;
    const availabilityProfileId = formData.get('availabilityProfileId') as string;
    const linkedUserId = formData.get('linkedUserId') as string;
    const trackOutboundCTIDevice = formData.get('trackOutboundCTIDevice') === 'true';

    // License flags
    const cti = formData.get('license_cti') === 'true';
    const pbx = formData.get('license_pbx') === 'true';
    const manager = formData.get('license_manager') === 'true';
    const record = formData.get('license_record') === 'true';
    const pci = formData.get('license_pci') === 'true';
    const scv = formData.get('license_scv') === 'true';
    const sms = formData.get('license_sms') === 'true';
    const whatsApp = formData.get('license_whatsApp') === 'true';
    const insights = formData.get('license_insights') === 'true';
    const freedom = formData.get('license_freedom') === 'true';

    const errors: string[] = [];

    // Validation
    if (!firstName || !lastName) {
      errors.push('First name and last name are required');
    }

    // Extension validation
    if (extension) {
      const extNum = parseInt(extension);
      if (isNaN(extNum) || extNum < EXTENSION_MIN || extNum > EXTENSION_MAX) {
        errors.push(`Extension must be between ${EXTENSION_MIN} and ${EXTENSION_MAX}`);
      }

      // Check for duplicate extension
      try {
        const duplicateCheck = await querySalesforce<{ Id: string }>(
          locals.instanceUrl!,
          locals.accessToken!,
          `SELECT Id FROM ${NAMESPACE}__User__c WHERE ${NAMESPACE}__SipExtension__c = '${extension}' AND Id != '${id}' LIMIT 1`
        );
        if (duplicateCheck.records.length > 0) {
          errors.push('Extension is already in use by another user');
        }

        // Also check groups
        const groupDuplicateCheck = await querySalesforce<{ Id: string }>(
          locals.instanceUrl!,
          locals.accessToken!,
          `SELECT Id FROM ${NAMESPACE}__Group__c WHERE ${NAMESPACE}__Extension__c = '${extension}' LIMIT 1`
        );
        if (groupDuplicateCheck.records.length > 0) {
          errors.push('Extension is already in use by a group');
        }
      } catch (e) {
        console.warn('Failed to check extension uniqueness:', e);
      }
    }

    // License validation
    const requestedLicenses = { cti, pbx, manager, record, pci, scv, sms, whatsApp, insights, freedom };
    
    // Get current user licenses to check if adding new ones
    try {
      const currentUserSoql = `
        SELECT ${NAMESPACE}__CTI__c, ${NAMESPACE}__PBX__c, ${NAMESPACE}__Manager__c, ${NAMESPACE}__Record__c,
               ${NAMESPACE}__PCI__c, ${NAMESPACE}__SCV__c, ${NAMESPACE}__SMS__c, ${NAMESPACE}__WhatsApp__c,
               ${NAMESPACE}__Insights__c, ${NAMESPACE}__Freedom__c
        FROM ${NAMESPACE}__User__c WHERE Id = '${id}'
      `;
      const currentUser = await querySalesforce<Record<string, boolean>>(locals.instanceUrl!, locals.accessToken!, currentUserSoql);
      
      if (currentUser.records.length > 0) {
        const current = currentUser.records[0];
        
        // Only validate new licenses being added
        const newLicenses: { [key: string]: boolean } = {};
        if (cti && !current[`${NAMESPACE}__CTI__c`]) newLicenses.cti = true;
        if (pbx && !current[`${NAMESPACE}__PBX__c`]) newLicenses.pbx = true;
        if (manager && !current[`${NAMESPACE}__Manager__c`]) newLicenses.manager = true;
        if (record && !current[`${NAMESPACE}__Record__c`]) newLicenses.record = true;
        if (pci && !current[`${NAMESPACE}__PCI__c`]) newLicenses.pci = true;
        if (scv && !current[`${NAMESPACE}__SCV__c`]) newLicenses.scv = true;
        if (sms && !current[`${NAMESPACE}__SMS__c`]) newLicenses.sms = true;
        if (whatsApp && !current[`${NAMESPACE}__WhatsApp__c`]) newLicenses.whatsApp = true;
        if (insights && !current[`${NAMESPACE}__Insights__c`]) newLicenses.insights = true;
        if (freedom && !current[`${NAMESPACE}__Freedom__c`]) newLicenses.freedom = true;
        
        if (Object.keys(newLicenses).length > 0) {
          const orgLicenses = await getOrganizationLicenses(locals.instanceUrl!, locals.accessToken!);
          const validation = validateUserLicenses(newLicenses, orgLicenses, false);
          
          if (!validation.valid) {
            errors.push(...validation.errors);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to validate licenses:', e);
    }

    // Check group membership license requirements
    try {
      const groupsSoql = `
        SELECT ${NAMESPACE}__Group__r.Name, 
               ${NAMESPACE}__Group__r.${NAMESPACE}__PBX__c,
               ${NAMESPACE}__Group__r.${NAMESPACE}__Manager__c,
               ${NAMESPACE}__Group__r.${NAMESPACE}__Record__c
        FROM ${NAMESPACE}__GroupMember__c
        WHERE ${NAMESPACE}__User__c = '${id}'
      `;
      const groupsResult = await querySalesforce<{
        nbavs__Group__r: {
          Name: string;
          nbavs__PBX__c: boolean;
          nbavs__Manager__c: boolean;
          nbavs__Record__c: boolean;
        };
      }>(locals.instanceUrl!, locals.accessToken!, groupsSoql);

      for (const gm of groupsResult.records) {
        const group = gm.nbavs__Group__r;
        if (!group) continue;

        // User cannot remove a license if they're in a group that requires it
        if (group.nbavs__PBX__c && !pbx) {
          errors.push(`Cannot remove PBX license: user is a member of group "${group.Name}" which requires PBX`);
        }
        if (group.nbavs__Manager__c && !manager) {
          errors.push(`Cannot remove Manager license: user is a member of group "${group.Name}" which requires Manager`);
        }
        if (group.nbavs__Record__c && !record) {
          errors.push(`Cannot remove Record license: user is a member of group "${group.Name}" which requires Record`);
        }
      }
    } catch (e) {
      console.warn('Failed to check group license requirements:', e);
    }

    if (errors.length > 0) {
      return fail(400, { error: errors.join('. ') });
    }

    try {
      // Build update payload
      const updateData: Record<string, unknown> = {
        [`${NAMESPACE}__FirstName__c`]: firstName,
        [`${NAMESPACE}__LastName__c`]: lastName,
        [`${NAMESPACE}__SipExtension__c`]: extension,
        [`${NAMESPACE}__MobilePhone__c`]: mobilePhone,
        [`${NAMESPACE}__Enabled__c`]: enabled,
        [`${NAMESPACE}__PermissionLevel__c`]: permissionLevel,
        [`${NAMESPACE}__TrackOutboundCTIDevice__c`]: trackOutboundCTIDevice,
        [`${NAMESPACE}__CTI__c`]: cti,
        [`${NAMESPACE}__PBX__c`]: pbx,
        [`${NAMESPACE}__Manager__c`]: manager,
        [`${NAMESPACE}__Record__c`]: record,
        [`${NAMESPACE}__PCI__c`]: pci,
        [`${NAMESPACE}__SCV__c`]: scv,
        [`${NAMESPACE}__SMS__c`]: sms,
        [`${NAMESPACE}__WhatsApp__c`]: whatsApp,
        [`${NAMESPACE}__Insights__c`]: insights,
        [`${NAMESPACE}__Freedom__c`]: freedom,
      };

      if (availabilityProfileId) {
        updateData[`${NAMESPACE}__AvailabilityProfile__c`] = availabilityProfileId;
      }

      if (linkedUserId) {
        updateData[`${NAMESPACE}__User__c`] = linkedUserId;
      }

      // Update Salesforce
      await updateSalesforce(
        locals.instanceUrl!,
        locals.accessToken!,
        `${NAMESPACE}__User__c`,
        id,
        updateData
      );

      // Also update Sapien if we have the sapien ID
      try {
        if (canUseSapienApi(locals)) {
          const sapienToken = await getSapienAccessToken(locals.instanceUrl!, locals.accessToken!);
          const sapienHost = getSapienHost();
          const organizationId = getOrganizationId();

          if (sapienHost && organizationId) {
            // Get the Sapien ID from the record
            const userSoql = `SELECT ${NAMESPACE}__Id__c FROM ${NAMESPACE}__User__c WHERE Id = '${id}'`;
            const userResult = await querySalesforce<{ nbavs__Id__c: number }>(
              locals.instanceUrl!,
              locals.accessToken!,
              userSoql
            );

            if (userResult.records[0]?.nbavs__Id__c) {
              const sapienId = userResult.records[0].nbavs__Id__c;
              await sapienRequest(
                sapienHost,
                sapienToken,
                'PATCH',
                `/v1/users/${organizationId}/${sapienId}`,
                {
                  firstName,
                  lastName,
                  sipExtension: extension,
                  mobilePhone,
                  enabled,
                }
              );
            }
          }
        }
      } catch (sapienError) {
        console.warn('Failed to sync user to Sapien:', sapienError);
        // Don't fail the request - Salesforce update succeeded
      }

      return { success: true };
    } catch (e) {
      console.error('Failed to update user:', e);
      return fail(500, { error: e instanceof Error ? e.message : 'Failed to update user' });
    }
  },

  toggleEnabled: async ({ params, locals }) => {
    const { id } = params;

    if (!hasValidCredentials(locals)) {
      return fail(401, { error: 'Not authenticated' });
    }

    try {
      // Get current enabled state
      const userSoql = `SELECT ${NAMESPACE}__Enabled__c FROM ${NAMESPACE}__User__c WHERE Id = '${id}'`;
      const userResult = await querySalesforce<{ nbavs__Enabled__c: boolean }>(
        locals.instanceUrl!,
        locals.accessToken!,
        userSoql
      );

      if (userResult.records.length === 0) {
        return fail(404, { error: 'User not found' });
      }

      const currentEnabled = userResult.records[0].nbavs__Enabled__c;

      // Toggle
      await updateSalesforce(
        locals.instanceUrl!,
        locals.accessToken!,
        `${NAMESPACE}__User__c`,
        id,
        { [`${NAMESPACE}__Enabled__c`]: !currentEnabled }
      );

      return { success: true, enabled: !currentEnabled };
    } catch (e) {
      console.error('Failed to toggle user enabled state:', e);
      return fail(500, { error: e instanceof Error ? e.message : 'Failed to update user' });
    }
  },
};

