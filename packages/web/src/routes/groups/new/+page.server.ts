import type { PageServerLoad, Actions } from './$types';
import { tryCreateContextAndRepositories } from '$lib/adapters';
import type { GroupLicenseInfo } from '$lib/repositories';
import { fail, redirect } from '@sveltejs/kit';

// Extension validation constants (from GroupController.cls)
const EXTENSION_MIN = 2000;
const EXTENSION_MAX = 7999;

export const load: PageServerLoad = async ({ locals }) => {
  const result = tryCreateContextAndRepositories(locals);

  // Not authenticated - show demo data
  if (!result) {
    return {
      isDemo: true,
      licenseInfo: {
        pbx: { enabled: true },
        manager: { enabled: true },
        record: { enabled: true },
      } as GroupLicenseInfo,
    };
  }

  const { repos, isDemo } = result;

  if (isDemo) {
    return {
      isDemo: true,
      licenseInfo: {
        pbx: { enabled: true },
        manager: { enabled: true },
        record: { enabled: true },
      } as GroupLicenseInfo,
    };
  }

  try {
    const licenseInfo = await repos.license.getGroupLicenseInfo();
    
    return {
      isDemo: false,
      licenseInfo,
    };
  } catch (e) {
    console.error('Failed to load license info:', e);
    return {
      isDemo: false,
      licenseInfo: null,
      error: e instanceof Error ? e.message : 'Failed to load license info',
    };
  }
};

export const actions: Actions = {
  create: async ({ locals, request }) => {
    const result = tryCreateContextAndRepositories(locals);
    if (!result) {
      return fail(401, { error: 'Not authenticated' });
    }

    const { repos, isDemo } = result;
    if (isDemo) {
      return fail(400, { error: 'Not available in demo mode' });
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const extension = formData.get('extension') as string;
    const ringStrategy = formData.get('ringStrategy') as string;
    const pbx = formData.get('pbx') === 'on';
    const manager = formData.get('manager') === 'on';
    const record = formData.get('record') === 'on';

    // Validation
    const errors: string[] = [];

    if (!name || name.trim().length === 0) {
      errors.push('Name is required');
    }

    // Extension validation
    if (extension) {
      const extNum = parseInt(extension);
      if (isNaN(extNum) || extNum < EXTENSION_MIN || extNum > EXTENSION_MAX) {
        errors.push(`Extension must be between ${EXTENSION_MIN} and ${EXTENSION_MAX}`);
      }

      // Check for duplicate extension in groups
      try {
        const isGroupExtAvailable = await repos.groups.isExtensionAvailable(extension);
        if (!isGroupExtAvailable) {
          errors.push('Extension is already in use by another group');
        }

        // Also check users
        const isUserExtAvailable = await repos.users.isExtensionAvailable(extension);
        if (!isUserExtAvailable) {
          errors.push('Extension is already in use by a user');
        }
      } catch (e) {
        console.warn('Failed to check extension uniqueness:', e);
      }
    }

    // License validation
    if (pbx || manager || record) {
      try {
        const licenseInfo = await repos.license.getGroupLicenseInfo();
        
        if (pbx && !licenseInfo.pbx.enabled) {
          errors.push('PBX license is not enabled for this organization');
        }
        if (manager && !licenseInfo.manager.enabled) {
          errors.push('Manager license is not enabled for this organization');
        }
        if (record && !licenseInfo.record.enabled) {
          errors.push('Record license is not enabled for this organization');
        }
      } catch (e) {
        console.warn('Failed to validate licenses:', e);
      }
    }

    if (errors.length > 0) {
      return fail(400, { error: errors.join('. ') });
    }

    try {
      const createResult = await repos.groups.create({
        name: name.trim(),
        description: description || '',
        extension: extension || undefined,
        pbx,
        manager,
        record,
      });

      if (!createResult.success) {
        return fail(500, { error: createResult.error || 'Failed to create group' });
      }

      // Redirect to the new group's detail page
      redirect(303, `/groups/${createResult.data!.id}`);
    } catch (e) {
      if ((e as { status?: number }).status === 303) throw e;
      
      console.error('Failed to create group:', e);
      
      // Parse errors
      let errorMessage = 'Failed to create group';
      if (e instanceof Error) {
        if (e.message.includes('SIP extension') || e.message.includes('DUPLICATE')) {
          errorMessage = 'The extension is already in use. Please provide a unique extension.';
        } else if (e.message.includes('email address')) {
          errorMessage = 'The email address is already in use. Please provide a unique email address.';
        } else {
          errorMessage = e.message;
        }
      }
      
      return fail(500, { error: errorMessage });
    }
  },
};
