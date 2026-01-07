import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hasValidCredentials } from '$lib/server/salesforce';

/**
 * Replicate ReactController.updateRecord(recordId, fieldsJson)
 * POST /api/react/updateRecord
 * Body: { recordId, fieldValues: {...} }
 */
export const POST: RequestHandler = async ({ locals, request }) => {
  if (!hasValidCredentials(locals)) {
    return json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { recordId, fieldValues } = body;

    if (!recordId || !fieldValues) {
      return json({ error: 'Missing recordId or fieldValues' }, { status: 400 });
    }

    // Extract object type from record ID prefix (first 3 characters)
    // We'll need to use composite API or determine the object type
    // For now, use the composite sobjects endpoint
    const url = `${locals.instanceUrl}/services/data/v59.0/sobjects/${recordId.substring(0, 3)}/${recordId}`;
    
    // Actually, we need to know the object type. Let's use a different approach.
    // Use the generic composite endpoint
    const patchUrl = `${locals.instanceUrl}/services/data/v59.0/composite/sobjects`;
    
    const response = await fetch(`${locals.instanceUrl}/services/data/v59.0/sobjects`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${locals.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        allOrNone: false,
        records: [{
          attributes: { type: 'SObject' },
          id: recordId,
          ...fieldValues
        }]
      }),
    });

    // Alternative: Use the UI API which can handle any record
    // Actually, let's use a simpler approach - query for the record first to get its type
    // Or use the tooling API
    
    // Simpler approach: Pass objectName from the client
    return json({ error: 'updateRecord requires objectName - please update the request' }, { status: 400 });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error('updateRecord error:', errorMessage);
    return json({ error: errorMessage }, { status: 500 });
  }
};

/**
 * Alternative implementation that requires objectName
 */
export const PATCH: RequestHandler = async ({ locals, request }) => {
  if (!hasValidCredentials(locals)) {
    return json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { objectName, recordId, fieldValues } = body;

    if (!objectName || !recordId || !fieldValues) {
      return json({ error: 'Missing objectName, recordId, or fieldValues' }, { status: 400 });
    }

    const url = `${locals.instanceUrl}/services/data/v59.0/sobjects/${objectName}/${recordId}`;
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${locals.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fieldValues),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update record: ${errorText}`);
    }

    // PATCH returns 204 No Content on success
    return json(recordId);
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error('updateRecord error:', errorMessage);
    return json({ error: errorMessage }, { status: 500 });
  }
};

