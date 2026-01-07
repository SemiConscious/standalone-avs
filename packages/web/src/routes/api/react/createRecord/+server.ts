import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hasValidCredentials } from '$lib/server/salesforce';

/**
 * Replicate ReactController.createRecord(objectName, fieldValuesString)
 * POST /api/react/createRecord
 * Body: { objectName, fieldValues: {...} }
 */
export const POST: RequestHandler = async ({ locals, request }) => {
    if (!hasValidCredentials(locals)) {
        return json({ error: 'Not authenticated' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { objectName, fieldValues } = body;

        if (!objectName || !fieldValues) {
            return json({ error: 'Missing objectName or fieldValues' }, { status: 400 });
        }

        // Use Salesforce REST API to create record
        const url = `${locals.instanceUrl}/services/data/v59.0/sobjects/${objectName}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${locals.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(fieldValues),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to create record: ${errorText}`);
        }

        const result = await response.json();
        return json(result.id);
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error('createRecord error:', errorMessage);
        return json({ error: errorMessage }, { status: 500 });
    }
};

