import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hasValidCredentials } from '$lib/server/salesforce';

/**
 * Replicate ReactController.deleteRecord(recordId)
 * POST /api/react/deleteRecord
 * Body: { objectName, recordId }
 */
export const POST: RequestHandler = async ({ locals, request }) => {
  if (!hasValidCredentials(locals)) {
    return json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { objectName, recordId } = body;

    if (!objectName || !recordId) {
      return json({ error: 'Missing objectName or recordId' }, { status: 400 });
    }

    const url = `${locals.instanceUrl}/services/data/v59.0/sobjects/${objectName}/${recordId}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${locals.accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete record: ${errorText}`);
    }

    // DELETE returns 204 No Content on success
    return json(true);
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error('deleteRecord error:', errorMessage);
    return json({ error: errorMessage }, { status: 500 });
  }
};

