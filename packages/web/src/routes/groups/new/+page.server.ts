import type { PageServerLoad, Actions } from './$types';
import { hasValidCredentials, createSalesforce, querySalesforce, getNamespace, getLicenseInfo } from '$lib/server/salesforce';
import { env } from '$env/dynamic/private';
import { fail, redirect } from '@sveltejs/kit';

const NAMESPACE = env.SALESFORCE_PACKAGE_NAMESPACE || 'nbavs';

// Extension validation constants (from GroupController.cls)
const EXTENSION_MIN = 2000;
const EXTENSION_MAX = 7999;

export const load: PageServerLoad = async ({ locals }) => {
  // Demo mode
  if (env.PUBLIC_DEMO_MODE === 'true' || env.PUBLIC_DEMO_MODE === '1') {
    return {
      isDemo: true,
      licenseInfo: {
        pbx: { enabled: true },
        manager: { enabled: true },
        record: { enabled: true },
      },
    };
  }

  if (!hasValidCredentials(locals)) {
    return {
      isDemo: false,
      licenseInfo: null,
      error: 'Not authenticated',
    };
  }

  try {
    const licenseInfo = await getLicenseInfo(locals.instanceUrl!, locals.accessToken!);
    
    return {
      isDemo: false,
      licenseInfo: {
        pbx: { enabled: licenseInfo.pbx.enabled },
        manager: { enabled: licenseInfo.manager.enabled },
        record: { enabled: licenseInfo.record.enabled },
      },
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
    if (!hasValidCredentials(locals)) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const extension = formData.get('extension') as string;
    const type = formData.get('type') as string;
    const ringStrategy = formData.get('ringStrategy') as string;
    const maxQueueTime = parseInt(formData.get('maxQueueTime') as string) || 300;
    const pbx = formData.get('pbx') === 'on';
    const manager = formData.get('manager') === 'on';
    const record = formData.get('record') === 'on';

    // Validation
    const errors: string[] = [];

    if (!name || name.trim().length === 0) {
      errors.push('Name is required');
    }

    // Extension validation (matching GroupController.cls)
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
          `SELECT Id FROM ${NAMESPACE}__Group__c WHERE ${NAMESPACE}__Extension__c = '${extension}' LIMIT 1`
        );
        if (duplicateCheck.records.length > 0) {
          errors.push('Extension is already in use by another group');
        }

        // Also check users
        const userDuplicateCheck = await querySalesforce<{ Id: string }>(
          locals.instanceUrl!,
          locals.accessToken!,
          `SELECT Id FROM ${NAMESPACE}__User__c WHERE ${NAMESPACE}__SipExtension__c = '${extension}' LIMIT 1`
        );
        if (userDuplicateCheck.records.length > 0) {
          errors.push('Extension is already in use by a user');
        }
      } catch (e) {
        console.warn('Failed to check extension uniqueness:', e);
      }
    }

    // License validation
    if (pbx || manager || record) {
      try {
        const licenseInfo = await getLicenseInfo(locals.instanceUrl!, locals.accessToken!);
        
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
      const result = await createSalesforce(
        locals.instanceUrl!,
        locals.accessToken!,
        `${NAMESPACE}__Group__c`,
        {
          Name: name.trim(),
          [`${NAMESPACE}__Description__c`]: description || '',
          [`${NAMESPACE}__Extension__c`]: extension || null,
          [`${NAMESPACE}__Type__c`]: ringStrategy || 'RING_ALL',
          [`${NAMESPACE}__MaxQueueTime__c`]: maxQueueTime,
          [`${NAMESPACE}__PBX__c`]: pbx,
          [`${NAMESPACE}__Manager__c`]: manager,
          [`${NAMESPACE}__Record__c`]: record,
        }
      );

      // Redirect to the new group's detail page
      throw redirect(303, `/groups/${result.id}`);
    } catch (e) {
      if ((e as { status?: number }).status === 303) throw e;
      
      console.error('Failed to create group:', e);
      
      // Parse Salesforce errors
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

