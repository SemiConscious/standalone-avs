/**
 * `POST /api/charlie/introspect`
 *
 * Partner-side endpoint Charlie calls back to verify a CRM token during
 * the `urn:nbox:idp:callback` token-exchange flow. See
 * `charlie-api/docs/STANDALONE_AVS_INTEGRATION.md` §4.3 and §4.4 for the
 * wider design.
 *
 * Contract: RFC 7662 OAuth 2.0 Token Introspection plus an `x_nbox`
 * extension block carrying the Natterbox-side claims.
 *
 * Auth between Charlie and us:
 *   - Authorization: Bearer <Charlie-signed JWT>
 *   - JWT is verified against Charlie's published JWKS (cached).
 *   - aud must equal our request origin.
 *   - body_sha256 claim must match SHA256(actual body) — prevents an
 *     attacker who somehow grabbed a valid Charlie JWT from rebinding it
 *     to a different introspection request.
 *
 * Identity resolution: SF access token -> userinfo -> SF user id ->
 * Natterbox numeric ids. Phase 1.1 uses env-var fallbacks
 * (CHARLIE_INTROSPECTION_NBX_ORG_ID / _NBX_USER_ID) for the mapping
 * because we don't yet have a SOQL-backed lookup wired here. Real
 * identity mapping (e.g. against a Natterbox_User_Id__c custom field
 * on the SF User) is Phase 2 work.
 *
 * Variant 7 (Sapien data-plane bootstrap): the response includes
 * `sapienAccessToken` + `sapienAccessTokenExpiresAt` under `x_nbox` when
 * the SF org has AVS installed (i.e. `nbavs__API_v1__c` carries Sapien
 * OAuth credentials). Charlie writes both fields into its session-store
 * DynamoDB row so its dispatcher can call Sapien on the user's behalf
 * without holding any Sapien credentials itself. See
 * `charlie-api/docs/CRM_INTEGRATION_GUIDE.md` §"What the partner returns".
 */

import { error, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createHash } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { getSapienAccessTokenWithExpiry } from '$lib/server/gatekeeper';

const SF_USERINFO_DEFAULT = 'https://login.salesforce.com/services/oauth2/userinfo';

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

export const POST: RequestHandler = async ({ request, url, fetch }) => {
  const expectedIssuer = env.CHARLIE_INTROSPECTION_EXPECTED_ISSUER;
  if (!expectedIssuer) {
    throw error(503, {
      message:
        'CHARLIE_INTROSPECTION_EXPECTED_ISSUER env var not configured; introspection endpoint is offline.',
    });
  }
  const jwksUri = env.CHARLIE_JWKS_URI ?? `${expectedIssuer.replace(/\/$/, '')}/.well-known/jwks.json`;

  // ---------------------------------------------------------------------------
  // Verify Charlie's request signature.
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

  if (verifiedClaims.sub !== 'charlie-introspection') {
    throw error(401, { message: 'Charlie request JWT has wrong sub claim.' });
  }
  if (verifiedClaims.body_sha256 !== bodyHash) {
    throw error(401, {
      message: 'Charlie request JWT body_sha256 does not match request body.',
    });
  }

  // ---------------------------------------------------------------------------
  // Parse the JSON body Charlie sent. (Charlie sends JSON rather than the
  // RFC 7662 form-encoded shape to dodge framework CSRF guards on the
  // partner side — SvelteKit, Next.js, etc. all block cross-origin form
  // POSTs by default.)
  // ---------------------------------------------------------------------------
  let parsed: { token?: unknown };
  try {
    parsed = JSON.parse(bodyText) as { token?: unknown };
  } catch {
    return inactiveResponse('NON_JSON_BODY');
  }
  const subjectToken = typeof parsed.token === 'string' ? parsed.token : null;
  if (!subjectToken) {
    return inactiveResponse('MISSING_TOKEN');
  }

  // ---------------------------------------------------------------------------
  // Verify the SF access token by calling userinfo. This both proves
  // liveness (SF rejects expired/revoked tokens) and pulls identity.
  // ---------------------------------------------------------------------------
  const userinfoUrl = env.CHARLIE_SF_USERINFO_URL ?? SF_USERINFO_DEFAULT;
  const userinfoResponse = await fetch(userinfoUrl, {
    method: 'GET',
    headers: { Authorization: `Bearer ${subjectToken}` },
  });
  if (!userinfoResponse.ok) {
    return inactiveResponse(`SF_USERINFO_${userinfoResponse.status}`);
  }

  let userinfo: SfUserinfo;
  try {
    userinfo = (await userinfoResponse.json()) as SfUserinfo;
  } catch {
    return inactiveResponse('SF_USERINFO_NON_JSON');
  }

  if (!userinfo.user_id || !userinfo.organization_id) {
    return inactiveResponse('SF_USERINFO_MISSING_FIELDS');
  }

  // ---------------------------------------------------------------------------
  // Map SF identity -> Natterbox numeric ids. Phase 1.1 stub.
  // ---------------------------------------------------------------------------
  const orgId = numericEnv('CHARLIE_INTROSPECTION_NBX_ORG_ID');
  const userId = numericEnv('CHARLIE_INTROSPECTION_NBX_USER_ID');
  if (orgId === null || userId === null) {
    throw error(503, {
      message:
        'CHARLIE_INTROSPECTION_NBX_ORG_ID / _NBX_USER_ID not configured; cannot map SF identity to Natterbox identity in Phase 1.1.',
    });
  }

  // Charlie expects a scope string in the response. For Phase 1.1 we grant
  // the full scope set the partner client is configured for — Charlie will
  // intersect this with the requested scopes upstream.
  const grantedScopes = (env.CHARLIE_INTROSPECTION_GRANTED_SCOPES ??
    'users:read users:admin groups:read groups:admin devices:read devices:admin ' +
    'phoneNumbers:read phoneNumbers:admin routingPolicies:read routingPolicies:admin ' +
    'calls:read calls:control calls:supervise agent:read agent:control media:read').trim();

  // ---------------------------------------------------------------------------
  // Variant 7 — mint a Sapien access token for the caller's org and ship
  // it alongside the identity claims. Charlie uses it as the Gatekeeper
  // bearer to mint per-user Sapien JWTs. We use the existing AVS
  // password-grant code path (lib/server/gatekeeper.ts) which reads the
  // OAuth credentials from `nbavs__API_v1__c` and POSTs to
  // `${sapien}/auth/token`.
  //
  // If AVS isn't installed in the SF org, or the SF user lacks read on
  // the custom setting, we log + omit the field. Charlie tolerates the
  // omission: Sapien-backed resolvers fail cleanly with SESSION_NOT_FOUND
  // / PlatformError, non-Sapien work continues to function.
  // ---------------------------------------------------------------------------
  let sapienAccessToken: string | undefined;
  let sapienAccessTokenExpiresAt: number | undefined;
  const instanceUrl = env.CHARLIE_INTROSPECTION_SF_INSTANCE_URL ?? userinfo.urls?.rest?.split('/services/')[0];
  if (instanceUrl) {
    try {
      const sapien = await getSapienAccessTokenWithExpiry(instanceUrl, subjectToken);
      sapienAccessToken = sapien.accessToken;
      sapienAccessTokenExpiresAt = Math.floor(sapien.expiresAt.getTime() / 1000);
    } catch (err) {
      // Don't fail the whole introspection — Charlie copes with
      // missing-token sessions. Just log so an operator can investigate
      // why this partner's Sapien provisioning is broken.
      console.warn(
        '[charlie/introspect] Sapien access-token acquisition failed; ' +
          'returning identity-only response. Sapien-backed Charlie resolvers will return SESSION_NOT_FOUND. ' +
          `Error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // The `x_nbox` block carries Natterbox identity + the Sapien access
  // token from variant 7. We deliberately do NOT include partner-CRM
  // credentials (SF access tokens, refresh tokens, instance URLs) —
  // Charlie is partner-CRM-agnostic on its data plane and has no
  // consumer for them. A previous revision sent a `crmContext` block
  // carrying the SF access token + instance URL; that pipeline (the
  // dispatcher-side `crm` claim, `CrmContextCipher`,
  // `@charlie/adapters-salesforce`) has been retired. Defence in depth:
  // even if Charlie were compromised, it would not have the SF token to
  // lift.
  //
  // The Sapien access token IS shipped — but Sapien is the
  // Natterbox-shared platform that every Charlie consumer ultimately
  // reaches, not a partner-CRM credential. The token is org-scoped
  // (one Natterbox org per `nbavs__API_v1__c` credential set), short-
  // lived (Sapien's expires_in), and stored Charlie-side keyed by JWT
  // jti so the JWT body never carries it.
  const xNbox: Record<string, unknown> = {
    organizationId: orgId,
    userId: userId,
    sfUserId: userinfo.user_id,
    sfOrgId: userinfo.organization_id,
  };
  if (sapienAccessToken && sapienAccessTokenExpiresAt) {
    xNbox['sapienAccessToken'] = sapienAccessToken;
    xNbox['sapienAccessTokenExpiresAt'] = sapienAccessTokenExpiresAt;
  }

  return new Response(
    JSON.stringify({
      active: true,
      iss: SF_USERINFO_DEFAULT,
      sub: `sf:${userinfo.user_id}`,
      exp: Math.floor(Date.now() / 1000) + 3600,
      scope: grantedScopes,
      x_nbox: xNbox,
    }),
    {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-store',
      },
    },
  );
};

// =============================================================================
// Helpers
// =============================================================================

interface SfUserinfo {
  user_id?: string;
  organization_id?: string;
  email?: string;
  preferred_username?: string;
  urls?: { rest?: string };
}

function inactiveResponse(reason: string): Response {
  return new Response(JSON.stringify({ active: false, reason }), {
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

function numericEnv(name: string): number | null {
  const value = env[name];
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}
