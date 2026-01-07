import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hasValidCredentials } from '$lib/server/salesforce';

interface PicklistValue {
  label: string;
  value: string;
}

interface FieldInfo {
  name: string;
  label: string;
  type: string;
  sortable: boolean;
  createable: boolean;
  updateable: boolean;
  nillable: boolean;
  filterable: boolean;
  defaultedOnCreate: boolean;
  picklistValues: PicklistValue[];
}

/**
 * Replicate ReactController.getSObjectFields(objectName)
 * Returns fields for a given SObject
 * 
 * GET /api/react/getSObjectFields?objectName=Account
 */
export const GET: RequestHandler = async ({ locals, url }) => {
  if (!hasValidCredentials(locals)) {
    return json({ error: 'Not authenticated' }, { status: 401 });
  }

  const objectName = url.searchParams.get('objectName');
  
  if (!objectName) {
    return json({ error: 'Missing objectName parameter' }, { status: 400 });
  }

  try {
    const describeUrl = `${locals.instanceUrl}/services/data/v59.0/sobjects/${objectName}/describe`;
    
    const response = await fetch(describeUrl, {
      headers: {
        'Authorization': `Bearer ${locals.accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to describe sobject: ${errorText}`);
    }

    const data = await response.json();
    
    // Map to the format expected by the React app
    const fields: FieldInfo[] = data.fields.map((field: {
      name: string;
      label: string;
      type: string;
      sortable: boolean;
      createable: boolean;
      updateable: boolean;
      nillable: boolean;
      filterable: boolean;
      defaultedOnCreate: boolean;
      picklistValues?: { label: string; value: string }[];
    }) => ({
      name: field.name,
      label: field.label,
      type: field.type.toLowerCase(),
      sortable: field.sortable,
      createable: field.createable,
      updateable: field.updateable,
      nillable: field.nillable,
      filterable: field.filterable,
      defaultedOnCreate: field.defaultedOnCreate,
      picklistValues: (field.picklistValues || []).map(pv => ({
        label: pv.label,
        value: pv.value,
      })),
    })).sort((a: FieldInfo, b: FieldInfo) => a.label.localeCompare(b.label));

    return json(fields);
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error('getSObjectFields error:', errorMessage);
    return json({ error: errorMessage }, { status: 500 });
  }
};

