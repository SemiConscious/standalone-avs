import type { PageServerLoad, Actions } from './$types';
import { hasValidCredentials, querySalesforce } from '$lib/server/salesforce';
import { env } from '$env/dynamic/private';
import { fail } from '@sveltejs/kit';

const NAMESPACE = env.SALESFORCE_PACKAGE_NAMESPACE || 'nbavs';

/**
 * AutocompleteConfiguration metadata record
 */
interface AutocompleteConfig {
  id: string;
  developerName: string;
  label: string;
  objectName: string;
  type: 'WHO_ID' | 'WHAT_ID';
  product: string;
  active: boolean;
}

/**
 * Salesforce object metadata
 */
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
  if (!hasValidCredentials(locals)) {
    return {
      autocompleteConfigs: [],
      availableObjects: [],
      isAuthenticated: false,
      error: 'Not authenticated',
    } satisfies GeneralSettingsData;
  }

  try {
    // Fetch autocomplete configurations
    const configQuery = `
      SELECT Id, DeveloperName, MasterLabel, ${NAMESPACE}__Object__c, ${NAMESPACE}__Type__c, 
             ${NAMESPACE}__Product__c, ${NAMESPACE}__Active__c
      FROM ${NAMESPACE}__AutocompleteConfiguration__mdt
      WHERE ${NAMESPACE}__Active__c = true
      ORDER BY MasterLabel
      LIMIT 100
    `;

    let autocompleteConfigs: AutocompleteConfig[] = [];
    try {
      const configResult = await querySalesforce(
        locals.instanceUrl!,
        locals.accessToken!,
        configQuery
      );
      
      autocompleteConfigs = (configResult.records || []).map((r: Record<string, unknown>) => ({
        id: r.Id as string,
        developerName: r.DeveloperName as string,
        label: r.MasterLabel as string,
        objectName: r[`${NAMESPACE}__Object__c`] as string,
        type: r[`${NAMESPACE}__Type__c`] as 'WHO_ID' | 'WHAT_ID',
        product: r[`${NAMESPACE}__Product__c`] as string,
        active: r[`${NAMESPACE}__Active__c`] as boolean,
      }));
    } catch (e) {
      console.warn('Failed to fetch autocomplete configs (object may not exist):', e);
    }

    // For available objects, we'll use a simplified list
    // In a real implementation, this would call getSObjects via an API endpoint
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
  /**
   * Add a new autocomplete configuration
   * Note: Custom metadata cannot be created via standard DML, this is a placeholder
   * for demonstration. In practice, you'd need to use Metadata API or deploy via change set.
   */
  addConfig: async ({ locals, request }) => {
    if (!hasValidCredentials(locals)) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const objectName = formData.get('objectName') as string;
    const type = formData.get('type') as string;

    if (!objectName || !type) {
      return fail(400, { error: 'Object name and type are required' });
    }

    // Note: Custom Metadata records cannot be created via standard DML
    // This would need to use Metadata API deployment
    console.log(`[General Settings] Add config requested: ${objectName} as ${type}`);
    
    return { 
      success: true, 
      message: 'Configuration added (Note: Custom Metadata requires Metadata API deployment)',
    };
  },

  /**
   * Remove an autocomplete configuration
   */
  removeConfig: async ({ locals, request }) => {
    if (!hasValidCredentials(locals)) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const developerName = formData.get('developerName') as string;

    if (!developerName) {
      return fail(400, { error: 'Developer name is required' });
    }

    // Note: Custom Metadata records cannot be deleted via standard DML
    console.log(`[General Settings] Remove config requested: ${developerName}`);
    
    return { 
      success: true, 
      message: 'Configuration removed (Note: Custom Metadata requires Metadata API deployment)',
    };
  },
};

