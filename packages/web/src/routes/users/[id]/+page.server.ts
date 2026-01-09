import type { PageServerLoad, Actions } from './$types';
import { tryCreateContextAndRepositories } from '$lib/adapters';
import type { User, AvailabilityProfile, CrmUser } from '$lib/domain';
import type { OrganizationLicenses, LicenseStatus } from '$lib/repositories';
import { error, fail } from '@sveltejs/kit';

// Extension validation constants
const EXTENSION_MIN = 1000;
const EXTENSION_MAX = 9999;

// Demo data
const DEMO_LICENSE_STATUS: LicenseStatus = {
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

const DEMO_USER: User = {
  id: 'u001',
  platformId: 12345,
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
  linkedCrmUser: { id: 'sf1', name: 'John Smith', email: 'john.smith@company.com' },
  groups: ['Sales Team', 'UK Support'],
  lastModified: new Date().toISOString(),
};

const DEMO_AVAILABILITY_PROFILES: AvailabilityProfile[] = [
  { id: 'ap1', name: 'Default' },
  { id: 'ap2', name: 'Support Level 2' },
  { id: 'ap3', name: 'Platform Support' },
];

const DEMO_CRM_USERS: CrmUser[] = [
  { id: 'sf1', name: 'John Smith', email: 'john.smith@company.com' },
  { id: 'sf2', name: 'Jane Doe', email: 'jane.doe@company.com' },
];

export const load: PageServerLoad = async ({ params, locals }) => {
  const { id } = params;

  const result = tryCreateContextAndRepositories(locals);

  // Not authenticated - show demo data
  if (!result) {
    return {
      user: { ...DEMO_USER, id },
      availabilityProfiles: DEMO_AVAILABILITY_PROFILES,
      salesforceUsers: DEMO_CRM_USERS,
      organizationLicenses: DEMO_ORG_LICENSES,
      isDemo: true,
      availabilityProfileId: 'ap2',
      linkedUserId: 'sf1',
    };
  }

  const { repos, isDemo } = result;

  if (isDemo) {
    return {
      user: { ...DEMO_USER, id },
      availabilityProfiles: DEMO_AVAILABILITY_PROFILES,
      salesforceUsers: DEMO_CRM_USERS,
      organizationLicenses: DEMO_ORG_LICENSES,
      isDemo: true,
      availabilityProfileId: 'ap2',
      linkedUserId: 'sf1',
    };
  }

  try {
    // Fetch organization licenses
    let organizationLicenses: OrganizationLicenses | null = null;
    try {
      organizationLicenses = await repos.license.getOrganizationLicenses();
    } catch (e) {
      console.warn('Failed to fetch organization licenses:', e);
    }

    // Fetch user
    const user = await repos.users.findById(id);
    if (!user) {
      throw error(404, 'User not found');
    }

    // Fetch availability profiles
    let availabilityProfiles: AvailabilityProfile[] = [];
    try {
      availabilityProfiles = await repos.users.getAvailabilityProfiles();
    } catch (e) {
      console.warn('Failed to fetch availability profiles:', e);
    }

    // Fetch CRM users for linking
    let salesforceUsers: CrmUser[] = [];
    try {
      salesforceUsers = await repos.users.getCrmUsers();
    } catch (e) {
      console.warn('Failed to fetch CRM users:', e);
    }

    return {
      user,
      availabilityProfiles,
      salesforceUsers,
      organizationLicenses,
      isDemo: false,
      // Include IDs for form initialization
      availabilityProfileId: user.availabilityProfileId || '',
      linkedUserId: user.linkedCrmUser?.id || '',
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

    const result = tryCreateContextAndRepositories(locals);
    if (!result) {
      return fail(401, { error: 'Not authenticated' });
    }

    const { repos, isDemo } = result;
    if (isDemo) {
      return fail(400, { error: 'Not available in demo mode' });
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
        const isAvailable = await repos.users.isExtensionAvailable(extension, id);
        if (!isAvailable) {
          errors.push('Extension is already in use');
        }
      } catch (e) {
        console.warn('Failed to check extension uniqueness:', e);
      }
    }

    // Check group membership license requirements
    try {
      const memberships = await repos.users.getGroupMemberships(id);
      
      for (const membership of memberships) {
        // User cannot remove a license if they're in a group that requires it
        // Note: This simplified check assumes membership has group purpose info
        // Full implementation would need to fetch group details
      }
    } catch (e) {
      console.warn('Failed to check group license requirements:', e);
    }

    if (errors.length > 0) {
      return fail(400, { error: errors.join('. ') });
    }

    try {
      const updateResult = await repos.users.update(id, {
        firstName,
        lastName,
        extension: extension || undefined,
        mobilePhone: mobilePhone || undefined,
        enabled,
        permissionLevel,
        trackOutboundCTIDevice,
        licenses: {
          cti,
          pbx,
          manager,
          record,
          pci,
          scv,
          sms,
          whatsApp,
          insights,
          freedom,
        },
        availabilityProfileId: availabilityProfileId || undefined,
        linkedCrmUserId: linkedUserId || undefined,
      });

      if (!updateResult.success) {
        return fail(500, { error: updateResult.error || 'Failed to update user' });
      }

      return { success: true };
    } catch (e) {
      console.error('Failed to update user:', e);
      return fail(500, { error: e instanceof Error ? e.message : 'Failed to update user' });
    }
  },

  toggleEnabled: async ({ params, locals }) => {
    const { id } = params;

    const result = tryCreateContextAndRepositories(locals);
    if (!result) {
      return fail(401, { error: 'Not authenticated' });
    }

    const { repos, isDemo } = result;
    if (isDemo) {
      return fail(400, { error: 'Not available in demo mode' });
    }

    try {
      const toggleResult = await repos.users.toggleEnabled(id);

      if (!toggleResult.success) {
        return fail(500, { error: toggleResult.error || 'Failed to toggle user enabled state' });
      }

      return { success: true, enabled: toggleResult.data?.enabled };
    } catch (e) {
      console.error('Failed to toggle user enabled state:', e);
      return fail(500, { error: e instanceof Error ? e.message : 'Failed to update user' });
    }
  },
};
