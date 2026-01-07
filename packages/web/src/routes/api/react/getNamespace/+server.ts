import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

/**
 * Replicate ReactController.getNamespace()
 * Returns the AVS namespace (nbavs)
 * 
 * GET /api/react/getNamespace
 */
export const GET: RequestHandler = async () => {
  const namespace = env.SALESFORCE_PACKAGE_NAMESPACE || 'nbavs';
  return json(namespace);
};

