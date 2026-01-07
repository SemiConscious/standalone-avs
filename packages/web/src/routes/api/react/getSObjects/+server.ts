import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hasValidCredentials } from '$lib/server/salesforce';

interface SObjectInfo {
  name: string;
  label: string;
  queryable: boolean;
  searchable: boolean;
  createable: boolean;
  updateable: boolean;
}

/**
 * Replicate ReactController.getSObjects()
 * Returns list of accessible SObjects
 * 
 * GET /api/react/getSObjects
 */
export const GET: RequestHandler = async ({ locals }) => {
  if (!hasValidCredentials(locals)) {
    return json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const url = `${locals.instanceUrl}/services/data/v59.0/sobjects`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${locals.accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get sobjects: ${errorText}`);
    }

    const data = await response.json();
    
    // Map to the format expected by the React app
    const sobjects: SObjectInfo[] = data.sobjects
      .filter((obj: { queryable: boolean; deprecatedAndHidden: boolean }) => 
        obj.queryable && !obj.deprecatedAndHidden
      )
      .map((obj: { 
        name: string; 
        label: string; 
        queryable: boolean;
        searchable: boolean;
        createable: boolean;
        updateable: boolean;
      }) => ({
        name: obj.name,
        label: obj.label,
        queryable: obj.queryable,
        searchable: obj.searchable,
        createable: obj.createable,
        updateable: obj.updateable,
      }))
      .sort((a: SObjectInfo, b: SObjectInfo) => a.label.localeCompare(b.label));

    return json(sobjects);
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error('getSObjects error:', errorMessage);
    return json({ error: errorMessage }, { status: 500 });
  }
};

