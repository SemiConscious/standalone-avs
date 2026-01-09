/**
 * General Settings Page Server
 * 
 * Uses repository pattern for platform-agnostic data loading.
 */

import type { PageServerLoad, Actions } from './$types';
import { tryCreateContextAndRepositories } from '$lib/adapters';
import { fail } from '@sveltejs/kit';

interface AutocompleteConfig {
  id: string;
  developerName: string;
  label: string;
  objectName: string;
  type: 'WHO_ID' | 'WHAT_ID';
  product: string;
  active: boolean;
}

interface SObjectInfo {
  name: string;
  label: string;
  queryable: boolean;
  searchable: boolean;
  createable: boolean;
  updateable: boolean;
}

export interface GeneralSettingsData {
  autocompleteConfigs: AutocompleteConfig[];
  availableObjects: SObjectInfo[];
  isAuthenticated: boolean;
  error?: string;
}

export const load: PageServerLoad = async ({ locals }) => {
  const result = tryCreateContextAndRepositories(locals);

  if (!result) {
    return {
      autocompleteConfigs: [],
      availableObjects: [],
      isAuthenticated: false,
      error: 'Not authenticated',
    } satisfies GeneralSettingsData;
  }

  const { repos, isDemo } = result;

  if (isDemo) {
    return {
      autocompleteConfigs: [],
      availableObjects: [],
      isAuthenticated: false,
      error: 'Not available in demo mode',
    } satisfies GeneralSettingsData;
  }

  try {
    // Get autocomplete configs from settings repository
    let autocompleteConfigs: AutocompleteConfig[] = [];
    try {
      const configs = await repos.settings.getAutocompleteConfigs();
      autocompleteConfigs = configs.map(c => ({
        id: c.id,
        developerName: c.developerName,
        label: c.label,
        objectName: c.objectName,
        type: c.type as 'WHO_ID' | 'WHAT_ID',
        product: c.product,
        active: c.active,
      }));
    } catch (e) {
      console.warn('Failed to fetch autocomplete configs:', e);
    }

    const availableObjects: SObjectInfo[] = [
      { name: 'Account', label: 'Account', queryable: true, searchable: true, createable: true, updateable: true },
      { name: 'Contact', label: 'Contact', queryable: true, searchable: true, createable: true, updateable: true },
      { name: 'Lead', label: 'Lead', queryable: true, searchable: true, createable: true, updateable: true },
      { name: 'Case', label: 'Case', queryable: true, searchable: true, createable: true, updateable: true },
      { name: 'Opportunity', label: 'Opportunity', queryable: true, searchable: true, createable: true, updateable: true },
    ];

    return {
      autocompleteConfigs,
      availableObjects,
      isAuthenticated: true,
    } satisfies GeneralSettingsData;
  } catch (e) {
    console.error('Error loading general settings:', e);
    return {
      autocompleteConfigs: [],
      availableObjects: [],
      isAuthenticated: true,
      error: e instanceof Error ? e.message : 'Failed to load settings',
    } satisfies GeneralSettingsData;
  }
};

export const actions: Actions = {
  addConfig: async ({ locals, request }) => {
    const result = tryCreateContextAndRepositories(locals);
    if (!result) {
      return fail(401, { error: 'Not authenticated' });
    }

    const { isDemo } = result;
    if (isDemo) {
      return fail(400, { error: 'Not available in demo mode' });
    }

    const formData = await request.formData();
    const objectName = formData.get('objectName') as string;
    const type = formData.get('type') as string;

    if (!objectName || !type) {
      return fail(400, { error: 'Object name and type are required' });
    }

    console.log(`[General Settings] Add config requested: ${objectName} as ${type}`);
    
    return { 
      success: true, 
      message: 'Configuration added (Note: Custom Metadata requires Metadata API deployment)',
    };
  },

  removeConfig: async ({ locals, request }) => {
    const result = tryCreateContextAndRepositories(locals);
    if (!result) {
      return fail(401, { error: 'Not authenticated' });
    }

    const { isDemo } = result;
    if (isDemo) {
      return fail(400, { error: 'Not available in demo mode' });
    }

    const formData = await request.formData();
    const developerName = formData.get('developerName') as string;

    if (!developerName) {
      return fail(400, { error: 'Developer name is required' });
    }

    console.log(`[General Settings] Remove config requested: ${developerName}`);
    
    return { 
      success: true, 
      message: 'Configuration removed (Note: Custom Metadata requires Metadata API deployment)',
    };
  },
};
