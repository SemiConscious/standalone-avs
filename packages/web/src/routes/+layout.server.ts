/**
 * Root Layout Server
 *
 * Provides platform and user information to all pages.
 * Platform is determined at the edge in hooks.server.ts.
 */

import type { LayoutServerLoad } from './$types';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import type { CharliePublicConfig } from '$lib/charlie';

export const load: LayoutServerLoad = async ({ locals }) => {
  // Get user from platform-specific auth or legacy fields
  const user = locals.salesforce?.user ?? locals.user ?? null;

  // Surface the Charlie URLs + webphone-enabled flag to the client. URLs
  // are non-secret; we keep them in private env vars to avoid baking
  // build-specific endpoints into the public bundle, then expose them per
  // request here. The webphone-enabled flag is build-time public per the
  // Phase-0 plan (Phase 2 derives it from Query.getLicense.licenses.webphone).
  const charlie: CharliePublicConfig = {
    appsyncHttp: env.CHARLIE_APPSYNC_HTTP ?? null,
    appsyncWss: env.CHARLIE_APPSYNC_WSS ?? null,
    webphoneEnabled:
      publicEnv.PUBLIC_CHARLIE_WEBPHONE_ENABLED === 'true' && !!locals.charlieSession,
  };

  return {
    user,
    platform: locals.platform,
    isDemo: locals.platform === 'demo',
    charlie,
  };
};
