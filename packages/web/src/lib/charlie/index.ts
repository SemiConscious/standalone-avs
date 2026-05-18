/**
 * Public barrel for `$lib/charlie`. Anything imported from outside this
 * directory must come through this index.
 */

export type {
  CharlieSession,
  TokenExchangeResult,
  TokenExchangeFailureReason,
  CharliePublicConfig,
  BrowserJwtResponse,
  BrowserJwtErrorResponse,
} from './types';

export { exchangeSalesforceAccessTokenForCharlieJwt, exchangeForBrowserJwt } from './auth';

export {
  createServerCharlieClient,
  BrowserCharlieClient,
  type ServerCharlieClient,
} from './client';

// Server-only helpers live in `./server.ts`. They are NOT re-exported
// from this barrel because they import `$env/dynamic/private`, which
// SvelteKit's bundler refuses to ship to the browser. Page-servers
// (`+page.server.ts` / `+server.ts`) that need them must import
// directly from `$lib/charlie/server`:
//
//   import { tryGetCharlieClient } from '$lib/charlie/server';
//
// Browser-safe consumers (Svelte components, browser-side stores) keep
// importing from `$lib/charlie` as before.

export {
  projectCharlieUser,
  projectCharlieGroup,
  projectCharlieGroupMember,
  projectCharlieDevice,
  projectCharliePhoneNumber,
  projectCharlieRoutingPolicy,
  projectCharlieCallLog,
  projectConnectionPagination,
  type CharlieConnection,
} from './projections';

export {
  configureRealtimeClient,
  subscribeStore,
  shutdownRealtimeClient,
  type RealtimeClientConfig,
} from './realtime';

export * as CharlieOperations from './operations';
