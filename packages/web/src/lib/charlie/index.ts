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

export {
  configureRealtimeClient,
  subscribeStore,
  shutdownRealtimeClient,
  type RealtimeClientConfig,
} from './realtime';

export * as CharlieOperations from './operations';
