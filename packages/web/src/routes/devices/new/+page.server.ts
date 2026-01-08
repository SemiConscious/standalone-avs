import type { Actions } from './$types';
import { hasValidCredentials, createSalesforce, querySalesforce } from '$lib/server/salesforce';
import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const NAMESPACE = env.SALESFORCE_PACKAGE_NAMESPACE || 'nbavs';

// Extension validation constants
const EXTENSION_MIN = 2000;
const EXTENSION_MAX = 7999;

export const actions: Actions = {
  create: async ({ locals, request }) => {
    if (!hasValidCredentials(locals)) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();

    // Extract form fields
    const extension = formData.get('extension') as string;
    const location = formData.get('location') as string;
    const description = formData.get('description') as string;
    const type = formData.get('type') as string;
    const model = formData.get('model') as string;
    const macAddress = formData.get('macAddress') as string;
    const enabled = formData.get('enabled') === 'true';

    const errors: string[] = [];

    // Validation
    if (!description) {
      errors.push('Description is required');
    }

    if (!type) {
      errors.push('Device type is required');
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
          `SELECT Id FROM ${NAMESPACE}__Device__c WHERE ${NAMESPACE}__Extension__c = '${extension}' LIMIT 1`
        );
        if (duplicateCheck.records.length > 0) {
          errors.push('Extension is already in use by another device');
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

    // MAC address validation (required for SIP devices)
    if (type === 'SIP') {
      if (!macAddress) {
        errors.push('MAC address is required for SIP devices');
      } else {
        const cleanedMac = macAddress.replace(/[^a-fA-F0-9]/g, '');
        if (cleanedMac.length !== 12) {
          errors.push('Invalid MAC address format');
        }
      }
    }

    if (errors.length > 0) {
      return fail(400, { error: errors.join('. ') });
    }

    try {
      // Build create payload
      const createData: Record<string, unknown> = {
        [`${NAMESPACE}__Extension__c`]: extension || null,
        [`${NAMESPACE}__Location__c`]: location || null,
        [`${NAMESPACE}__Description__c`]: description,
        [`${NAMESPACE}__Type__c`]: type,
        [`${NAMESPACE}__Model__c`]: model || null,
        [`${NAMESPACE}__MAC__c`]: macAddress || null,
        [`${NAMESPACE}__Enabled__c`]: enabled,
      };

      // Create in Salesforce
      const result = await createSalesforce(
        locals.instanceUrl!,
        locals.accessToken!,
        `${NAMESPACE}__Device__c`,
        createData
      );

      // Redirect to the new device's detail page
      throw redirect(303, `/devices/${result.id}`);
    } catch (e) {
      if ((e as { status?: number }).status === 303) {
        throw e; // Re-throw redirects
      }
      console.error('Failed to create device:', e);
      return fail(500, {
        error: e instanceof Error ? e.message : 'Failed to create device',
      });
    }
  },
};
