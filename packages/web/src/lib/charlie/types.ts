/**
 * Shared types for the Charlie integration. Used by both the server-side
 * `lib/charlie/auth.ts` / `lib/charlie/client.ts` and the browser-side
 * `lib/charlie/realtime.ts`.
 *
 * Companion design docs:
 *   - `charlie-api/docs/STANDALONE_AVS_INTEGRATION.md` (the integration plan)
 *   - `charlie-api/docs/WEBPHONE.md` (the webphone-specific design)
 */

/**
 * The Charlie JWT (opaque to us) plus the metadata we extract from it.
 * Populated by `lib/charlie/auth.ts` on a successful token exchange.
 */
export interface CharlieSession {
  jwt: string;
  /** Unix seconds. The whole session is no longer valid once `Date.now() > expiresAt * 1000`. */
  expiresAt: number;
  /** Space-separated scopes granted to this token. */
  scopes: readonly string[];
  /** Natterbox numeric org id, decoded from the JWT body. */
  organizationId: number;
  /** Natterbox numeric user id, decoded from the JWT body. Always present for user-token-exchange sessions. */
  userId: number;
}

/**
 * Outcome of a `lib/charlie/auth.ts` token-exchange attempt. We don't throw
 * on Charlie returning 501 (NOT_IMPLEMENTED) because that's the *expected*
 * state in Phase 0 — `SalesforceIdentityProvider` hasn't landed in
 * `@charlie/auth` yet. Callers (hooks.server.ts) want to log + carry on.
 */
export type TokenExchangeResult =
  | { ok: true; session: CharlieSession }
  | { ok: false; reason: TokenExchangeFailureReason; message: string; httpStatus: number };

export type TokenExchangeFailureReason =
  /** Charlie returned 501 — `SalesforceIdentityProvider` not yet registered. Expected in Phase 0. */
  | 'NOT_IMPLEMENTED'
  /** The Salesforce access token presented as `subject_token` was rejected. */
  | 'SUBJECT_TOKEN_INVALID'
  /** Charlie token-exchange URL is missing (env var unset). */
  | 'NOT_CONFIGURED'
  /** Network error or non-JSON response. */
  | 'NETWORK_ERROR'
  /** Anything else, including 5xx from Charlie. */
  | 'UNKNOWN';

/**
 * Browser-facing Charlie URLs + feature flags exposed via the layout server
 * load. The browser uses these to construct its own GraphQL HTTP + WSS
 * clients (it never reads the server-only env vars).
 */
export interface CharliePublicConfig {
  /** AppSync HTTP endpoint (or `null` when Charlie is not configured for this env). */
  appsyncHttp: string | null;
  /** AppSync realtime / subscription endpoint. */
  appsyncWss: string | null;
  /** Whether to render the webphone widget at all. Driven by the build-time `PUBLIC_CHARLIE_WEBPHONE_ENABLED` flag in Phase 0; will be license-driven in Phase 2. */
  webphoneEnabled: boolean;
}

/**
 * The browser-scoped Charlie JWT returned by `/api/charlie/jwt`. Same shape
 * as `CharlieSession` minus the high-level scopes (browser tokens only get
 * the call/agent/media scopes the webphone needs).
 */
export interface BrowserJwtResponse {
  ok: true;
  jwt: string;
  expiresAt: number;
  scopes: readonly string[];
}

export interface BrowserJwtErrorResponse {
  ok: false;
  reason: TokenExchangeFailureReason;
  message: string;
}
