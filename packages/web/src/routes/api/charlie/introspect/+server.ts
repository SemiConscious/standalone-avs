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
import {
  fetchSapienUserIdentity,
  getNatterboxUserId,
  getSapienAccessTokenWithExpiry,
  getSapienHost,
} from '$lib/server/gatekeeper';

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

  // Charlie expects a scope string in the response. For Phase 1.1 we grant
  // the full scope set the partner client is configured for — Charlie will
  // intersect this with the requested scopes upstream.
  //
  // Note: Charlie's per-resolver `@scopes` directives are the authoritative
  // gate. If you add a new resolver gated on a scope not in this list,
  // also update `charlie-dev-partner-clients[clientId=pc_…].allowedScopes`
  // and verify the user's token-exchange picks up the new scope (current
  // sessions are cached by jti — log out + back in to refresh).
  const grantedScopes = (
    env.CHARLIE_INTROSPECTION_GRANTED_SCOPES ??
    'users:read users:admin groups:read groups:admin devices:read devices:admin ' +
    'phoneNumbers:read phoneNumbers:admin routingPolicies:read routingPolicies:admin ' +
    'calls:read calls:control calls:supervise callLogs:read ' +
    'agent:read agent:control media:read recordings:read recordings:control'
  ).trim();

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
  let sapienResolvedOrgId: number | undefined;
  let sapienResolvedUserId: number | undefined;
  const instanceUrl =
    env.CHARLIE_INTROSPECTION_SF_INSTANCE_URL ?? userinfo.urls?.rest?.split('/services/')[0];
  if (instanceUrl) {
    try {
      const sapien = await getSapienAccessTokenWithExpiry(instanceUrl, subjectToken);
      sapienAccessToken = sapien.accessToken;
      sapienAccessTokenExpiresAt = Math.floor(sapien.expiresAt.getTime() / 1000);

      // Resolve the bearer's REAL Sapien identity. Two independent lookups:
      //
      //   1. **Org id** comes from `Sapien /user/me`. The Sapien token is
      //      the AVS variant-7 API-user's token, but `/user/me` correctly
      //      reports `organisationId` for the Natterbox tenant the AVS
      //      package is provisioned against (typically the SF org's
      //      Natterbox org).
      //
      //   2. **User id** must come from the AVS Salesforce side, NOT
      //      `/user/me`. `/user/me` returns the bearer's identity — for the
      //      AVS variant-7 chain that's the API-service-account user
      //      (e.g. `4peklibjkum8gkcc088o808g0wkk40w@avs.natterbox.com`),
      //      not the SF user who is logged in. Resolving the SF user's
      //      Natterbox identity requires a SOQL lookup against
      //      `nbavs__User__c WHERE nbavs__User__c = '<sfUserId>'`,
      //      keyed by the SF user id from the userinfo response. This is
      //      the same lookup the AVS Apex code (`AuthGatekeeper.cls`)
      //      performs client-side.
      //
      //      Without this lookup, Charlie's per-user Sapien resolvers
      //      (e.g. `getMediaTransport` → `findFirstWebphoneForUser`) end
      //      up looking for the API user's webphone provisioning, find
      //      none (by design — service accounts don't get webphones),
      //      and fall back to a placeholder SIP password. The user's
      //      browser then sees `REGISTRATION_FAILED` against `webphoned`.
      //
      // Falls back to env-var stubs (Phase 1.1 carry-overs) only when
      // both Sapien-side and SF-side lookups fail, so local-dev / demo
      // environments without a real `nbavs__User__c` record continue to
      // function for non-webphone work.
      const sapienHost = getSapienHost();
      if (sapienHost) {
        try {
          const identity = await fetchSapienUserIdentity(sapienHost, sapien.accessToken);
          sapienResolvedOrgId = identity.orgId;
        } catch (identityErr) {
          console.warn(
            '[charlie/introspect] Sapien /user/me lookup failed (orgId resolution); ' +
            'falling back to CHARLIE_INTROSPECTION_NBX_ORG_ID stub. Error: ' +
            `${identityErr instanceof Error ? identityErr.message : String(identityErr)}`,
          );
        }
      }
      try {
        sapienResolvedUserId = await getNatterboxUserId(
          instanceUrl,
          subjectToken,
          userinfo.user_id,
        );
      } catch (mapErr) {
        console.warn(
          '[charlie/introspect] SF -> Natterbox user-id lookup failed for SF user ' +
          `${userinfo.user_id}; the AVS package may not be installed in the SF org or ` +
          'the user may not have a `nbavs__User__c` record. Falling back to ' +
          'CHARLIE_INTROSPECTION_NBX_USER_ID stub (webphone provisioning will be ' +
          `placeholder). Error: ${mapErr instanceof Error ? mapErr.message : String(mapErr)}`,
        );
      }
      // SIP credentials + any other per-resource lookups happen on
      // demand via `/api/charlie/callback` once Charlie's
      // getMediaTransport runs — see docs/PARTNER_CALLBACK.md.
      // Introspection is identity-only.
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

  // ---------------------------------------------------------------------------
  // Map SF identity -> Natterbox numeric ids. Prefer the Sapien-resolved
  // identity (the canonical one for Sapien REST + Gatekeeper); fall back to
  // env-var stubs only when the Sapien path is unavailable, so local-dev /
  // demo environments continue to function with the original stubs.
  // ---------------------------------------------------------------------------
  const orgId = sapienResolvedOrgId ?? numericEnv('CHARLIE_INTROSPECTION_NBX_ORG_ID');
  const userId = sapienResolvedUserId ?? numericEnv('CHARLIE_INTROSPECTION_NBX_USER_ID');
  if (orgId === null || userId === null || orgId === undefined || userId === undefined) {
    throw error(503, {
      message:
        'Could not resolve a Natterbox identity for this user. Sapien /user/me failed and ' +
        'CHARLIE_INTROSPECTION_NBX_ORG_ID / _NBX_USER_ID fallbacks are not configured.',
    });
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
