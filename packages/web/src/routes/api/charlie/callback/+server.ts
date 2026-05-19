/**
 * `POST /api/charlie/callback`
 *
 * Generic CRM-agnostic partner-callback endpoint Charlie POSTs to
 * when a resolver needs partner-side data on demand. Same security
 * envelope as `/api/charlie/introspect` (Charlie-signed JWT,
 * `body_sha256` binding to the request body, audience pinned to our
 * origin) but a different request shape: a `reason` discriminator
 * plus a `context` blob.
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
 *     "context": { "organizationId": 4090, "userId": 119010, "correlationId": "..." }
 *   }
 *
 * ## Response
 *
 *   {
 *     "active": true,
 *     "data": { ...reason-specific shape... },
 *     "ttl": 300
 *   }
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
 * Adding a new reason is a one-case extension on the `switch` below —
 * no contract changes elsewhere.
 *
 * ## Authentication to Salesforce
 *
 * Charlie does NOT ship the user's SF token to this endpoint — by
 * design, the partner-callback `context` carries only Natterbox-side
 * identity. So we authenticate to Salesforce using a service-account
 * username + password grant against a pre-configured Connected App.
 * Credentials live in Vercel env vars:
 *
 *   - `CHARLIE_CALLBACK_SF_INSTANCE_URL`
 *   - `CHARLIE_CALLBACK_SF_CLIENT_ID`
 *   - `CHARLIE_CALLBACK_SF_CLIENT_SECRET`
 *   - `CHARLIE_CALLBACK_SF_USERNAME`
 *   - `CHARLIE_CALLBACK_SF_PASSWORD` — concatenated `password+securityToken`
 *
 * Phase 2 TODO: swap to JWT Bearer flow (Connected App with private key)
 * so we don't need to store a password. Tracked in
 * `docs/PARTNER_CALLBACK.md` § "Out of scope".
 *
 * Tokens are cached in-process for the SF session lifetime; the
 * Vercel runtime keeps the warm function alive across requests for
 * ~minutes which is enough for the webphone-bootstrap path's locality.
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

// Cached service-account SF session. Mints fresh on cold start +
// expiry. Vercel keeps warm functions alive long enough for this to
// usefully amortise across requests.
let cachedSfSession: { instanceUrl: string; accessToken: string; expiresAt: number } | null = null;
const SF_SESSION_REFRESH_BEFORE_EXPIRY_MS = 5 * 60_000;

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
      message: `Charlie request JWT verification failed: ${
        err instanceof Error ? err.message : String(err)
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
  let parsed: { reason?: unknown; context?: unknown };
  try {
    parsed = JSON.parse(bodyText) as { reason?: unknown; context?: unknown };
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

  // ---------------------------------------------------------------------------
  // Reason-code dispatch.
  //
  // Each case returns either:
  //   - { active: true, data, ttl? } on success,
  //   - { active: false, reason } when the resource doesn't exist for
  //     this user/reason (Charlie treats this as null and falls back).
  //
  // Adding a new reason: add a case here that resolves whatever the
  // partner-side data source is. Charlie's GraphQL resolver knows the
  // shape it expects in `data`; document the contract in
  // STANDALONE_AVS_INTEGRATION.md § "Partner callback reasons".
  // ---------------------------------------------------------------------------
  switch (parsed.reason) {
    case 'fetch_sip_credentials':
      return handleFetchSipCredentials(context);
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

async function handleFetchSipCredentials(context: Record<string, unknown>): Promise<Response> {
  const userId = typeof context['userId'] === 'number' ? context['userId'] : null;
  if (userId == null) {
    return Response.json(
      { active: false, reason: 'CONTEXT_MISSING_USER_ID' },
      { status: 200 },
    );
  }

  const sf = await getServiceAccountSfSession();
  if (!sf) {
    return Response.json(
      { active: false, reason: 'CALLBACK_SF_AUTH_UNAVAILABLE' },
      { status: 200 },
    );
  }

  let creds;
  try {
    creds = await getWebphoneSipCredentials(sf.instanceUrl, sf.accessToken, userId);
  } catch (err) {
    console.warn(
      `[charlie/callback] fetch_sip_credentials: SOQL failed for NBX user ${userId}: ${
        err instanceof Error ? err.message : String(err)
      }`,
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
// Service-account SF session.
//
// Phase-1.1 stub: username + password grant against a configured
// Connected App. Phase 2 should swap to JWT Bearer (private key in
// Secrets Manager).
// ---------------------------------------------------------------------------

async function getServiceAccountSfSession(): Promise<{
  instanceUrl: string;
  accessToken: string;
} | null> {
  const now = Date.now();
  if (
    cachedSfSession &&
    cachedSfSession.expiresAt > now + SF_SESSION_REFRESH_BEFORE_EXPIRY_MS
  ) {
    return cachedSfSession;
  }

  const tokenUrl = env.CHARLIE_CALLBACK_SF_TOKEN_URL ?? 'https://login.salesforce.com/services/oauth2/token';
  const clientId = env.CHARLIE_CALLBACK_SF_CLIENT_ID;
  const clientSecret = env.CHARLIE_CALLBACK_SF_CLIENT_SECRET;
  const username = env.CHARLIE_CALLBACK_SF_USERNAME;
  // Note: password should already include the security token suffix
  // unless the Connected App is on a trusted IP. Document this in the
  // env-var description.
  const password = env.CHARLIE_CALLBACK_SF_PASSWORD;

  if (!clientId || !clientSecret || !username || !password) {
    console.warn(
      '[charlie/callback] service-account SF env not configured; ' +
        'fetch_sip_credentials will return active: false. Set ' +
        'CHARLIE_CALLBACK_SF_CLIENT_ID, _CLIENT_SECRET, _USERNAME, _PASSWORD.',
    );
    return null;
  }

  const params = new URLSearchParams({
    grant_type: 'password',
    client_id: clientId,
    client_secret: clientSecret,
    username,
    password,
  });

  let response;
  try {
    response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
  } catch (err) {
    console.warn(
      `[charlie/callback] SF service-account auth fetch failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return null;
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    console.warn(
      `[charlie/callback] SF service-account auth returned ${response.status}: ${errText.slice(0, 300)}`,
    );
    return null;
  }

  let json: { access_token?: string; instance_url?: string; issued_at?: string };
  try {
    json = (await response.json()) as typeof json;
  } catch {
    console.warn('[charlie/callback] SF service-account auth body was not JSON');
    return null;
  }

  if (!json.access_token || !json.instance_url) {
    console.warn(
      '[charlie/callback] SF service-account auth response missing access_token / instance_url',
    );
    return null;
  }

  // SF doesn't return an `expires_in`; service-account tokens default
  // to 2h on most orgs. Cache for 1h to be safe.
  cachedSfSession = {
    instanceUrl: json.instance_url,
    accessToken: json.access_token,
    expiresAt: now + 60 * 60 * 1000,
  };
  return cachedSfSession;
}
