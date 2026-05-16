/**
 * Server-side helper that exchanges a Salesforce OAuth access token for a
 * Charlie session JWT via `POST /token/exchange`. Called from
 * `hooks.server.ts` once per request, after the SF cookie auth resolves.
 *
 * Charlie expects RFC 8693 token-exchange form params with
 * `subject_token_type=urn:nbox:idp:salesforce`. This URN is anticipated by
 * `STANDALONE_AVS_INTEGRATION.md` §4 and matched by the
 * `SalesforceIdentityProvider` implementation slated for Phase 1.
 *
 * Phase 0 caveat: Charlie has *no* IdP providers registered. Every call
 * returns 501 NOT_IMPLEMENTED. We don't throw on that — `hooks.server.ts`
 * still wants to render the page; the webphone simply degrades to its
 * mock-registrar fallback.
 */

import type { CharlieSession, TokenExchangeResult } from './types';

const SALESFORCE_SUBJECT_TOKEN_TYPE = 'urn:nbox:idp:salesforce';
const TOKEN_EXCHANGE_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:token-exchange';

const DEFAULT_BROWSER_SCOPES = [
  'media:read',
  'calls:read',
  'calls:control',
  'agent:read',
  'agent:control',
] as const;

/**
 * Exchange a Salesforce access token for a Charlie session JWT.
 *
 * @param salesforceAccessToken Bearer token from the SF cookie session.
 * @param tokenExchangeBase Base URL of Charlie's token-exchange endpoint
 *   (typically `https://auth.dev.charlie.natterbox-dev03.net`). When `null`
 *   the function short-circuits with `NOT_CONFIGURED`.
 * @param requestedScopes Optional scope subset. Defaults to the
 *   `users:read`-style scopes a SvelteKit `+page.server.ts` would need —
 *   tighten / loosen at the call site if appropriate.
 */
export async function exchangeSalesforceAccessTokenForCharlieJwt(
  salesforceAccessToken: string,
  tokenExchangeBase: string | null,
  fetchImpl: typeof fetch = fetch,
  requestedScopes?: readonly string[]
): Promise<TokenExchangeResult> {
  if (!tokenExchangeBase) {
    return {
      ok: false,
      reason: 'NOT_CONFIGURED',
      message: 'CHARLIE_TOKEN_EXCHANGE_BASE env var is unset; Charlie integration disabled.',
      httpStatus: 0,
    };
  }

  const body = new URLSearchParams({
    grant_type: TOKEN_EXCHANGE_GRANT_TYPE,
    subject_token: salesforceAccessToken,
    subject_token_type: SALESFORCE_SUBJECT_TOKEN_TYPE,
  });
  if (requestedScopes && requestedScopes.length > 0) {
    body.set('scope', requestedScopes.join(' '));
  }

  let response: Response;
  try {
    response = await fetchImpl(`${tokenExchangeBase.replace(/\/$/, '')}/token/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });
  } catch (err) {
    return {
      ok: false,
      reason: 'NETWORK_ERROR',
      message: err instanceof Error ? err.message : 'Unknown network error',
      httpStatus: 0,
    };
  }

  if (response.status === 501) {
    return {
      ok: false,
      reason: 'NOT_IMPLEMENTED',
      message:
        'Charlie /token/exchange returned 501 — SalesforceIdentityProvider not yet registered ' +
        '(see STANDALONE_AVS_INTEGRATION.md §4 + sequencing Phase 1.1).',
      httpStatus: 501,
    };
  }

  if (response.status === 401 || response.status === 400) {
    const message = await safeReadBodyText(response);
    return {
      ok: false,
      reason: 'SUBJECT_TOKEN_INVALID',
      message: `Charlie rejected the Salesforce token (${response.status}): ${message}`,
      httpStatus: response.status,
    };
  }

  if (!response.ok) {
    const message = await safeReadBodyText(response);
    return {
      ok: false,
      reason: 'UNKNOWN',
      message: `Charlie /token/exchange returned ${response.status}: ${message}`,
      httpStatus: response.status,
    };
  }

  let payload: { access_token?: string; expires_in?: number; scope?: string };
  try {
    payload = (await response.json()) as typeof payload;
  } catch (err) {
    return {
      ok: false,
      reason: 'NETWORK_ERROR',
      message: `Failed to parse Charlie /token/exchange JSON response: ${
        err instanceof Error ? err.message : String(err)
      }`,
      httpStatus: response.status,
    };
  }

  if (!payload.access_token) {
    return {
      ok: false,
      reason: 'UNKNOWN',
      message: 'Charlie /token/exchange response missing access_token field.',
      httpStatus: response.status,
    };
  }

  const decoded = decodeJwtBodyClaims(payload.access_token);
  if (!decoded) {
    return {
      ok: false,
      reason: 'UNKNOWN',
      message: 'Charlie /token/exchange returned a token we could not decode.',
      httpStatus: response.status,
    };
  }

  const session: CharlieSession = {
    jwt: payload.access_token,
    expiresAt: decoded.exp,
    scopes: (payload.scope ?? '').split(/\s+/).filter(Boolean),
    organizationId: decoded.organizationId,
    userId: decoded.userId,
  };
  return { ok: true, session };
}

/**
 * Convenience wrapper around `exchangeSalesforceAccessTokenForCharlieJwt`
 * that asks Charlie for the *browser*-scoped JWT — i.e. only the scopes
 * the webphone + subscription client actually need. Used by
 * `/api/charlie/jwt/+server.ts`.
 */
export function exchangeForBrowserJwt(
  salesforceAccessToken: string,
  tokenExchangeBase: string | null,
  fetchImpl: typeof fetch = fetch
): Promise<TokenExchangeResult> {
  return exchangeSalesforceAccessTokenForCharlieJwt(
    salesforceAccessToken,
    tokenExchangeBase,
    fetchImpl,
    DEFAULT_BROWSER_SCOPES
  );
}

// =============================================================================
// Local helpers
// =============================================================================

async function safeReadBodyText(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 1000);
  } catch {
    return '(failed to read response body)';
  }
}

/**
 * Decode the JWT body without verifying the signature — we trust the
 * issuer transitively, since Charlie just issued the token and we'll send
 * it back to Charlie. We need the body to populate `CharlieSession`
 * metadata without doing a second round-trip.
 *
 * Returns `null` if the JWT is malformed.
 */
function decodeJwtBodyClaims(
  jwt: string
): { exp: number; organizationId: number; userId: number } | null {
  const parts = jwt.split('.');
  if (parts.length !== 3) return null;
  const body = parts[1];
  if (!body) return null;
  try {
    const padded = body.padEnd(body.length + ((4 - (body.length % 4)) % 4), '=');
    const json = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
    const claims = JSON.parse(json) as {
      exp?: number;
      organizationId?: number;
      userId?: number;
    };
    if (typeof claims.exp !== 'number' || typeof claims.organizationId !== 'number') {
      return null;
    }
    return {
      exp: claims.exp,
      organizationId: claims.organizationId,
      userId: typeof claims.userId === 'number' ? claims.userId : 0,
    };
  } catch {
    return null;
  }
}
