import type { Actions } from './$types';
import { hasValidCredentials, createSalesforce, querySalesforce } from '$lib/server/salesforce';
import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { redirect } from '@sveltejs/kit';
import {
  canUseSapienApi,
  getSapienAccessToken,
  getSapienHost,
  getOrganizationId,
} from '$lib/server/gatekeeper';
import { sapienRequest } from '$lib/server/sapien';

const NAMESPACE = env.SALESFORCE_PACKAGE_NAMESPACE || 'nbavs';

// Extension validation constants
const EXTENSION_MIN = 1000;
const EXTENSION_MAX = 9999;

export const actions: Actions = {
  create: async ({ locals, request }) => {
    if (!hasValidCredentials(locals)) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();

    // Extract form fields
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const email = formData.get('email') as string;
    const username = formData.get('username') as string;
    const extension = formData.get('extension') as string;
    const mobilePhone = formData.get('mobilePhone') as string;
    const permissionLevel = (formData.get('permissionLevel') as string) || 'Basic';
    const enabled = formData.get('enabled') === 'true';

    const errors: string[] = [];

    // Validation
    if (!firstName || !lastName) {
      errors.push('First name and last name are required');
    }

    if (!email && !username) {
      errors.push('Either email or username is required');
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
          `SELECT Id FROM ${NAMESPACE}__User__c WHERE ${NAMESPACE}__SipExtension__c = '${extension}' LIMIT 1`
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

    if (errors.length > 0) {
      return fail(400, { error: errors.join('. ') });
    }

    try {
      // Build create payload
      const createData: Record<string, unknown> = {
        [`${NAMESPACE}__FirstName__c`]: firstName,
        [`${NAMESPACE}__LastName__c`]: lastName,
        [`${NAMESPACE}__Username__c`]: username || email,
        [`${NAMESPACE}__SipExtension__c`]: extension || null,
        [`${NAMESPACE}__MobilePhone__c`]: mobilePhone || null,
        [`${NAMESPACE}__Enabled__c`]: enabled,
        [`${NAMESPACE}__PermissionLevel__c`]: permissionLevel,
      };

      // Create in Salesforce
      const result = await createSalesforce(
        locals.instanceUrl!,
        locals.accessToken!,
        `${NAMESPACE}__User__c`,
        createData
      );

      // Optionally create in Sapien if API is available
      if (result.success && result.id && canUseSapienApi(locals)) {
        try {
          const sapienToken = await getSapienAccessToken(locals.instanceUrl!, locals.accessToken!);
          const sapienHost = getSapienHost();
          const organizationId = getOrganizationId();

          if (sapienHost && organizationId) {
            await sapienRequest(
              sapienHost,
              sapienToken,
              'POST',
              `/v1/users/${organizationId}`,
              {
                firstName,
                lastName,
                username: username || email,
                sipExtension: extension || undefined,
                mobilePhone: mobilePhone || undefined,
                enabled,
              }
            );

            // Update Salesforce record with Sapien ID if returned
            // (This would require the Sapien API to return the ID)
          }
        } catch (sapienError) {
          console.warn('Failed to create user in Sapien:', sapienError);
          // Don't fail the request - Salesforce creation succeeded
        }
      }

      // Redirect to the new user's detail page
      throw redirect(303, `/users/${result.id}`);
    } catch (e) {
      if ((e as { status?: number }).status === 303) {
        throw e; // Re-throw redirects
      }
      console.error('Failed to create user:', e);
      return fail(500, {
        error: e instanceof Error ? e.message : 'Failed to create user',
      });
    }
  },
};
