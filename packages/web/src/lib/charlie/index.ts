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

export { tryGetCharlieClient, isDomainEnabled, type CharlieDomain } from './server';

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
