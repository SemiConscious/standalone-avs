/**
 * `POST /api/charlie/jwt`
 *
 * Mints a short-lived, browser-scoped Charlie JWT for the authenticated
 * user. Called by the browser-side webphone + graphql-ws subscription
 * client whenever they need to (re)establish their Charlie credentials.
 *
 * Why a separate endpoint rather than putting the JWT in `+layout.server.ts`'s
 * page data: page data is HTML-injected and visible to anything that can
 * read the document (browser extensions, debug tools). An endpoint lets us
 * keep the JWT lifecycle in `fetch()` calls that are scoped to our own JS,
 * and the JWT itself is short-lived (~15 minutes) so leakage is bounded.
 *
 * Phase 0: every successful request hits Charlie's `/token/exchange`,
 * which currently returns 501 NOT_IMPLEMENTED (SalesforceIdentityProvider
 * hasn't landed). We surface that distinctly from a real auth failure so
 * the webphone can degrade to its mock-registrar fallback.
 */

import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { exchangeForBrowserJwt } from '$lib/charlie';
import type { RequestHandler } from './$types';
import type { BrowserJwtErrorResponse, BrowserJwtResponse } from '$lib/charlie';

export const POST: RequestHandler = async ({ locals, fetch }) => {
  const sfAccessToken = locals.salesforce?.accessToken ?? locals.accessToken;
  if (!sfAccessToken) {
    throw error(401, {
      message: 'Not authenticated against Salesforce; cannot mint a Charlie session.',
    });
  }

  const tokenExchangeBase = env.CHARLIE_TOKEN_EXCHANGE_BASE ?? null;
  const result = await exchangeForBrowserJwt(sfAccessToken, tokenExchangeBase, fetch);

  if (!result.ok) {
    const payload: BrowserJwtErrorResponse = {
      ok: false,
      reason: result.reason,
      message: result.message,
    };
    // Use 503 for "Charlie unavailable / not yet wired" so the browser can
    // distinguish this from a 401 (which would mean the user lost their SF
    // session and needs to re-login).
    return json(payload, { status: 503 });
  }

  const payload: BrowserJwtResponse = {
    ok: true,
    jwt: result.session.jwt,
    expiresAt: result.session.expiresAt,
    scopes: result.session.scopes,
  };
  return json(payload);
};
