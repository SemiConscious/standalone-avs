/**
 * Server-side Charlie helpers for SvelteKit `+page.server.ts` loaders.
 *
 * `tryGetCharlieClient(locals)` is the per-request gate every Charlie-
 * preferred page-server loader threads through. It returns a
 * `ServerCharlieClient` when:
 *
 *   1. The hooks-server token-exchange succeeded and populated
 *      `locals.charlieSession` with a non-expired JWT, AND
 *   2. The build-time `CHARLIE_APPSYNC_HTTP` env var is set, AND
 *   3. The opt-in flag `CHARLIE_DATA_SOURCE` covers this domain.
 *
 * Otherwise returns `null` — the caller falls through to its existing
 * SF / demo path. This is the per-domain feature-flag described in
 * `STANDALONE_AVS_INTEGRATION.md` §"Tier 1 migration".
 *
 * Domains supported by the env-var allowlist:
 *
 *   `CHARLIE_DATA_SOURCE=users,groups,devices,phone-numbers,routing-policies,call-logs`
 *   `CHARLIE_DATA_SOURCE=*`     # opt-in everything Charlie supports
 *   (unset / empty)             # always fall through to SF
 *
 * Per-domain rollout lets us migrate one page-server at a time, observe
 * production behaviour, then add the next domain to the allowlist.
 *
 * Misuse-resistant: if a caller passes a domain name that's not in the
 * allowlist, `tryGetCharlieClient` returns `null`. That's deliberate —
 * we want a typo to silently fall back to SF, not to silently activate
 * an un-rollout-tested code path.
 */

import { env } from '$env/dynamic/private';
import { createServerCharlieClient, type ServerCharlieClient } from './client';

export type CharlieDomain =
  | 'users'
  | 'groups'
  | 'devices'
  | 'phone-numbers'
  | 'routing-policies'
  | 'call-logs';

/**
 * Returns a Charlie GraphQL client for `locals.charlieSession` when the
 * domain has been opted into via `CHARLIE_DATA_SOURCE`. Returns `null`
 * when the caller should fall back to its existing data source.
 *
 * Charlie call sites use this as:
 *
 * ```ts
 * const charlie = tryGetCharlieClient(locals, 'users');
 * if (charlie) {
 *   try {
 *     return await charlie.request(ListUsersQuery, { input: ... });
 *   } catch (err) {
 *     console.warn('[charlie/users] falling back to SF:', err);
 *   }
 * }
 * // existing SF path
 * ```
 */
export function tryGetCharlieClient(
  locals: App.Locals,
  domain: CharlieDomain
): ServerCharlieClient | null {
  const session = locals.charlieSession;
  if (!session) return null;

  // Defence-in-depth: hooks.server.ts already discards expired sessions
  // when the token exchange ran, but check again here so a long-lived
  // SvelteKit container with stale `locals` can't ship dead tokens.
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (session.expiresAt - 60 <= nowSeconds) return null;

  const appsyncHttp = env.CHARLIE_APPSYNC_HTTP;
  if (!appsyncHttp) return null;

  if (!isDomainEnabled(domain)) return null;

  return createServerCharlieClient(appsyncHttp, session);
}

/**
 * Parses `CHARLIE_DATA_SOURCE` to decide whether a domain is opted in.
 * Comma-separated list, with `*` as the everything wildcard. Whitespace
 * tolerated; case-insensitive.
 *
 * Exported so tests + the Charlie-status admin page can introspect it.
 */
export function isDomainEnabled(domain: CharlieDomain): boolean {
  const raw = env.CHARLIE_DATA_SOURCE?.trim();
  if (!raw) return false;
  if (raw === '*') return true;
  const tokens = raw
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);
  return tokens.includes(domain);
}
