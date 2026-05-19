/**
 * `POST /api/charlie/callback`
 *
 * Generic CRM-agnostic partner-callback endpoint Charlie POSTs to
 * when a resolver needs partner-side data on demand. Same security
 * envelope as `/api/charlie/introspect` (Charlie-signed JWT,
 * `body_sha256` binding to the request body, audience pinned to our
 * origin) but a different request shape: a `reason` discriminator,
 * a `context` blob, and an opaque `partner_session` bag carrying
 * exactly the user-scoped credentials we minted at introspection
 * time.
 *
 * Wider design: `charlie-api/docs/PARTNER_CALLBACK.md`.
 *
 * ## Request
 *
 *   POST /api/charlie/callback
 *   Authorization: Bearer <Charlie-signed JWT>
 *   Content-Type: application/json
 *
 *   {
 *     "reason": "fetch_sip_credentials",
 *     "context": { "organizationId": 4090, "userId": 119010, "correlationId": "..." },
 *     "partner_session": { "accessToken": "00D...", "instanceUrl": "https://*.my.salesforce.com" }
 *   }
 *
 * `partner_session` is the user's SF OAuth access token + instance
 * URL — the same token they authenticated with at login. We use it
 * to authenticate the SOQL we issue against `nbavs__Device__c`.
 * Crucially this means:
 *
 *   - We never hold a service-account credential. The token is
 *     user-scoped, no broader, no longer-lived than the user's own
 *     SF session.
 *   - When the user logs out / the SF token is revoked, the next
 *     callback fails fast with `INVALID_SESSION_ID` and the user is
 *     prompted to re-auth. No silent drift.
 *
 * ## Response
 *
 *   { "active": true, "data": { ...reason-specific shape... }, "ttl": 300 }
 *
 * `active: false` (with optional `reason`) means "Charlie's request is
 * syntactically valid but we have nothing to return for this user/
 * reason" — Charlie treats that as null and falls back to whatever the
 * resolver's null-handling is.
 *
 * ## Reason-code dispatch (current)
 *
 *   - `fetch_sip_credentials` — calls `getWebphoneSipCredentials(...)`
 *     (SOQL on `nbavs__Device__c` + AES-256-CBC decrypt of
 *     `nbavs__Password__c`). Returns
 *     `{ username, password, domain, host, ext? }`.
 *
 * Adding a new reason is a one-case extension on the `switch` below.
 */

import { error, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createHash } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { getWebphoneSipCredentials } from '$lib/server/gatekeeper';

// JWKS cache shared with the introspect endpoint — same Charlie
// public key, same cooldown / TTL.
let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks(jwksUri: string): ReturnType<typeof createRemoteJWKSet> {
  if (!cachedJwks) {
    cachedJwks = createRemoteJWKSet(new URL(jwksUri), {
      cooldownDuration: 30_000,
      cacheMaxAge: 5 * 60_000,
    });
  }
  return cachedJwks;
}

interface PartnerSession {
  accessToken: string;
  instanceUrl: string;
}

export const POST: RequestHandler = async ({ request, url }) => {
  const expectedIssuer = env.CHARLIE_INTROSPECTION_EXPECTED_ISSUER;
  if (!expectedIssuer) {
    throw error(503, {
      message:
        'CHARLIE_INTROSPECTION_EXPECTED_ISSUER env var not configured; callback endpoint is offline.',
    });
  }
  const jwksUri = env.CHARLIE_JWKS_URI ?? `${expectedIssuer.replace(/\/$/, '')}/.well-known/jwks.json`;

  // ---------------------------------------------------------------------------
  // Verify Charlie's request signature (same envelope as introspect).
  // ---------------------------------------------------------------------------
  const authHeader = request.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    throw error(401, { message: 'Missing Bearer credential.' });
  }
  const requestJwt = authHeader.slice('Bearer '.length).trim();

  const bodyText = await request.text();
  const bodyHash = createHash('sha256').update(bodyText).digest('hex');

  let verifiedClaims: { sub?: unknown; body_sha256?: unknown };
  try {
    const { payload } = await jwtVerify(requestJwt, getJwks(jwksUri), {
      issuer: expectedIssuer,
      audience: url.origin,
      algorithms: ['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'PS256', 'HS256'],
    });
    verifiedClaims = payload;
  } catch (err) {
    throw error(401, {
      message: `Charlie request JWT verification failed: ${err instanceof Error ? err.message : String(err)
        }`,
    });
  }

  if (verifiedClaims.sub !== 'charlie-callback') {
    throw error(401, { message: 'Charlie request JWT has wrong sub claim.' });
  }
  if (verifiedClaims.body_sha256 !== bodyHash) {
    throw error(401, {
      message: 'Charlie request JWT body_sha256 does not match request body.',
    });
  }

  // ---------------------------------------------------------------------------
  // Parse the request body.
  // ---------------------------------------------------------------------------
  let parsed: { reason?: unknown; context?: unknown; partner_session?: unknown };
  try {
    parsed = JSON.parse(bodyText) as typeof parsed;
  } catch {
    throw error(400, { message: 'Request body is not valid JSON.' });
  }
  if (typeof parsed.reason !== 'string' || parsed.reason.length === 0) {
    throw error(400, { message: 'Request body is missing the `reason` field.' });
  }
  if (parsed.context == null || typeof parsed.context !== 'object') {
    throw error(400, { message: 'Request body is missing the `context` object.' });
  }
  const context = parsed.context as Record<string, unknown>;
  const partnerSession = parsePartnerSession(parsed.partner_session);

  // ---------------------------------------------------------------------------
  // Reason-code dispatch.
  //
  // Each case returns either:
  //   - { active: true, data, ttl? } on success,
  //   - { active: false, reason } when the resource doesn't exist for
  //     this user/reason (Charlie treats this as null and falls back).
  //
  // Adding a new reason: add a case here. Charlie's GraphQL resolver
  // knows the shape it expects in `data`; document the contract in
  // STANDALONE_AVS_INTEGRATION.md § "Partner callback reasons".
  // ---------------------------------------------------------------------------
  switch (parsed.reason) {
    case 'fetch_sip_credentials':
      return handleFetchSipCredentials(context, partnerSession);
    default:
      return Response.json(
        { active: false, reason: 'UNKNOWN_REASON' },
        { status: 200 },
      );
  }
};

// ---------------------------------------------------------------------------
// Reason: fetch_sip_credentials
// ---------------------------------------------------------------------------

async function handleFetchSipCredentials(
  context: Record<string, unknown>,
  partnerSession: PartnerSession | null,
): Promise<Response> {
  const userId = typeof context['userId'] === 'number' ? context['userId'] : null;
  if (userId == null) {
    return Response.json(
      { active: false, reason: 'CONTEXT_MISSING_USER_ID' },
      { status: 200 },
    );
  }

  if (!partnerSession) {
    // Charlie's session row had no `partnerSession` block, or it was
    // malformed. The user logged in before this code path existed
    // (so their session predates `partner_session`), or AVS isn't
    // installed so introspection couldn't ship a usable SF token.
    // Either way, the user needs to log out + log back in for the
    // session to pick up.
    return Response.json(
      { active: false, reason: 'NO_PARTNER_SESSION' },
      { status: 200 },
    );
  }

  let creds;
  try {
    creds = await getWebphoneSipCredentials(
      partnerSession.instanceUrl,
      partnerSession.accessToken,
      userId,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // SF returns 401 / `INVALID_SESSION_ID` once the user's token
    // expires or is revoked. Surface it as a soft inactive — Charlie
    // returns null, the resolver falls back to placeholder, the UI
    // surfaces "no webphone provisioned" until the user re-auths.
    if (/INVALID_SESSION_ID|401/i.test(message)) {
      return Response.json(
        { active: false, reason: 'PARTNER_SESSION_EXPIRED' },
        { status: 200 },
      );
    }
    console.warn(
      `[charlie/callback] fetch_sip_credentials: SOQL failed for NBX user ${userId}: ${message}`,
    );
    return Response.json(
      { active: false, reason: 'CALLBACK_SOQL_ERROR' },
      { status: 200 },
    );
  }

  if (!creds) {
    return Response.json(
      { active: false, reason: 'NO_WEBPHONE_PROVISIONED' },
      { status: 200 },
    );
  }

  return Response.json(
    {
      active: true,
      data: {
        username: creds.username,
        password: creds.password,
        domain: creds.domain,
        host: creds.host,
        ...(creds.ext != null && { ext: creds.ext }),
      },
      // 5-minute cache hint. SIP passwords don't rotate often; the
      // shorter TTL lets us pick up a rotation within ~5min while
      // amortising SOQL cost across multiple resolver hits in a
      // session.
      ttl: 300,
    },
    { status: 200 },
  );
}

// ---------------------------------------------------------------------------
// partner_session parsing.
//
// Validates the shape Charlie ships (`{ accessToken, instanceUrl }`)
// without throwing — a malformed session is treated the same as
// "missing": the dispatch returns active: false with a diagnostic
// reason rather than 4xx-ing the partner callback.
// ---------------------------------------------------------------------------

function parsePartnerSession(value: unknown): PartnerSession | null {
  if (value == null || typeof value !== 'object') return null;
  const obj = value as Record<string, unknown>;
  const accessToken = typeof obj['accessToken'] === 'string' ? obj['accessToken'] : null;
  const instanceUrl = typeof obj['instanceUrl'] === 'string' ? obj['instanceUrl'] : null;
  if (!accessToken || !instanceUrl) return null;
  // Defensive — SF instance URLs are always https://. If we ever ship
  // anything else here it's a config bug; reject so we don't make
  // outbound HTTP requests to attacker-controlled origins.
  try {
    const parsed = new URL(instanceUrl);
    if (parsed.protocol !== 'https:') return null;
  } catch {
    return null;
  }
  return { accessToken, instanceUrl };
}
