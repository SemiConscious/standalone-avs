import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { querySalesforce, hasValidCredentials } from '$lib/server/salesforce';

/**
 * Replicate ReactController.getRecords(objectName, fieldValuesString, sWhere, sOrderBy, sLimit)
 * POST /api/react/getRecords
 * Body: { objectName, fields, where, orderBy, limit }
 */
export const POST: RequestHandler = async ({ locals, request }) => {
  if (!hasValidCredentials(locals)) {
    return json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { objectName, fields, where, orderBy, limit } = body;

    if (!objectName || !fields || !Array.isArray(fields)) {
      return json({ error: 'Missing objectName or fields' }, { status: 400 });
    }

    // Build SOQL query
    let query = `SELECT ${fields.join(', ')} FROM ${objectName}`;
    
    if (where) {
      query += ` WHERE ${where}`;
    }
    
    query += ' WITH SECURITY_ENFORCED';
    
    if (orderBy) {
      query += ` ORDER BY ${orderBy}`;
    }
    
    if (limit) {
      query += ` LIMIT ${limit}`;
    }

    const result = await querySalesforce(
      locals.instanceUrl!,
      locals.accessToken!,
      query
    );

    return json(result.records);
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error('getRecords error:', errorMessage);
    return json({ error: errorMessage }, { status: 500 });
  }
};

