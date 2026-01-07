import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { querySalesforce, hasValidCredentials } from '$lib/server/salesforce';

/**
 * Replicate ReactController.query(soqlQuery)
 * POST /api/react/query
 * Body: { query: "SELECT ... FROM ..." }
 */
export const POST: RequestHandler = async ({ locals, request }) => {
  if (!hasValidCredentials(locals)) {
    return json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== 'string') {
      return json({ error: 'Missing or invalid query parameter' }, { status: 400 });
    }

    const result = await querySalesforce(
      locals.instanceUrl!,
      locals.accessToken!,
      query
    );

    return json(result.records);
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error('Query error:', errorMessage);
    return json({ error: errorMessage }, { status: 500 });
  }
};

