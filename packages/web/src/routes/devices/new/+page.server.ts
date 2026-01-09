/**
 * New Device Page Server
 * 
 * Uses repository pattern for device creation.
 */

import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { createAdapterContext, getRepositories } from '$lib/adapters';

// Extension validation constants
const EXTENSION_MIN = 2000;
const EXTENSION_MAX = 9999;

export const actions: Actions = {
  create: async ({ locals, request }) => {
    let ctx;
    try {
      ctx = createAdapterContext(locals);
    } catch {
      return fail(401, { error: 'Not authenticated' });
    }

    const { devices: deviceRepo, users: userRepo } = getRepositories(ctx);

    const formData = await request.formData();

    // Extract form fields
    const extension = formData.get('extension')?.toString() || '';
    const location = formData.get('location')?.toString() || '';
    const description = formData.get('description')?.toString() || '';
    const type = formData.get('type')?.toString() || 'SIP';
    const model = formData.get('model')?.toString() || '';
    const macAddress = formData.get('macAddress')?.toString() || '';
    const enabled = formData.get('enabled') === 'true';

    // Validation
    const errors: string[] = [];

    if (!description.trim()) {
      errors.push('Description is required');
    }

    // Validate extension if provided
    if (extension) {
      const extNum = parseInt(extension, 10);
      if (isNaN(extNum) || extNum < EXTENSION_MIN || extNum > EXTENSION_MAX) {
        errors.push(`Extension must be between ${EXTENSION_MIN} and ${EXTENSION_MAX}`);
      } else {
        // Check for duplicate extension
        const extensionAvailable = await userRepo.isExtensionAvailable(extension);
        if (!extensionAvailable) {
          errors.push('Extension is already in use');
        }
      }
    }

    // Validate MAC address format if provided
    if (macAddress) {
      const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
      if (!macRegex.test(macAddress)) {
        errors.push('Invalid MAC address format (use XX:XX:XX:XX:XX:XX)');
      }
    }

    if (errors.length > 0) {
      return fail(400, {
        error: errors.join('. '),
        values: { extension, location, description, type, model, macAddress, enabled },
      });
    }

    const result = await deviceRepo.create({
      extension: extension || undefined,
      location: location || undefined,
      description,
      type: (type as 'SIP' | 'Softphone' | 'Web Phone') || 'SIP',
      model: model || undefined,
      macAddress: macAddress || undefined,
      enabled,
    });

    if (!result.success) {
      return fail(500, { error: result.error || 'Failed to create device' });
    }

    // Redirect to the new device's detail page
    throw redirect(303, `/devices/${result.data!.id}`);
  },
};
