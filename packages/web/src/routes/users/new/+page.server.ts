import type { Actions } from './$types';
import { tryCreateContextAndRepositories } from '$lib/adapters';
import { fail, redirect } from '@sveltejs/kit';

// Extension validation constants
const EXTENSION_MIN = 1000;
const EXTENSION_MAX = 9999;

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
        const isUserExtAvailable = await repos.users.isExtensionAvailable(extension);
        if (!isUserExtAvailable) {
          errors.push('Extension is already in use');
        }
      } catch (e) {
        console.warn('Failed to check extension uniqueness:', e);
      }
    }

    if (errors.length > 0) {
      return fail(400, { error: errors.join('. ') });
    }

    try {
      const createResult = await repos.users.create({
        firstName,
        lastName,
        username: username || email,
        email: email || username,
        extension: extension || undefined,
        mobilePhone: mobilePhone || undefined,
        enabled,
        permissionLevel,
      });

      if (!createResult.success) {
        return fail(500, { error: createResult.error || 'Failed to create user' });
      }

      // Redirect to the new user's detail page
      redirect(303, `/users/${createResult.data!.id}`);
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
