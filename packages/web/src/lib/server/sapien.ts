/**
 * Sapien API Client for Server-Side Operations
 * 
 * This module provides server-side access to the Natterbox Sapien API.
 * 
 * Authentication Flow:
 * 1. User authenticates with Salesforce OAuth → SF access token
 * 2. We call the Apex REST endpoint /services/apexrest/nbavs/token/{scope} with SF token
 * 3. Salesforce internally:
 *    a. Authenticates with Sapien API using stored credentials (API_v1__c)
 *    b. Calls Gatekeeper: GET /token/sapien/organisation/{orgId}/user/{userId}?scope={scope}
 *    c. Returns the JWT from Gatekeeper
 * 4. We receive the Sapien JWT to make API calls
 * 
 * API Settings are fetched from: /services/apexrest/nbavs/HostUrlSettings/APISettings
 * This exposes the protected API_v1__c custom setting including:
 * - Gatekeeper_Host__c: The gatekeeper URL for JWT requests
 * - OrganizationId__c: The Natterbox organization ID
 * - Host__c: The Sapien API host
 * - And many more host URLs
 * 
 * This approach leverages the existing Salesforce infrastructure and doesn't
 * require separate Sapien credentials for the standalone app.
 */

import { env } from '$env/dynamic/private';
import { fetchApiSettings, type NatterboxApiSettings, clearApiSettingsCache as clearSalesforceApiSettingsCache } from './salesforce';

// The Sapien JWT and its expiry (JWTs are typically short-lived)
let cachedJwt: { token: string; expiresAt: Date; scope: string; payload: JwtPayload } | null = null;

// Cached API settings from Salesforce
let cachedApiSettings: { settings: NatterboxApiSettings; expiresAt: Date } | null = null;

// Default JWT lifetime in seconds (5 minutes - conservative estimate)
const JWT_LIFETIME_SECONDS = 300;

// API settings cache TTL (5 minutes)
const API_SETTINGS_CACHE_TTL_MS = 5 * 60 * 1000;

// Natterbox JWT claim namespace
const NB_CLAIM_PREFIX = 'https://natterbox.com/claim/';

/**
 * Decoded JWT payload from Sapien/Gatekeeper
 */
export interface JwtPayload {
  /** Natterbox organization ID (from namespaced claim) */
  'https://natterbox.com/claim/orgId'?: string;
  /** Natterbox user ID (from namespaced claim) */
  'https://natterbox.com/claim/userId'?: string;
  /** Username (from namespaced claim) */
  'https://natterbox.com/claim/username'?: string;
  /** Requestor ID (from namespaced claim) */
  'https://natterbox.com/claim/requestorId'?: string;
  /** Namespace (from namespaced claim) */
  'https://natterbox.com/claim/ns'?: string;
  /** Issuer */
  iss?: string;
  /** Granted scope */
  scope?: string;
  /** Issued at (Unix timestamp) */
  iat?: number;
  /** Not before (Unix timestamp) */
  nbf?: number;
  /** Expiration (Unix timestamp) */
  exp?: number;
  /** Any other claims */
  [key: string]: unknown;
}

/**
 * Helper to get a Natterbox claim from the JWT payload
 */
function getNbClaim(payload: JwtPayload, claimName: string): string | undefined {
  return payload[`${NB_CLAIM_PREFIX}${claimName}`] as string | undefined;
}

/**
 * Decode a JWT payload without verification
 * (We trust the JWT since we got it from Salesforce/Gatekeeper)
 */
export function decodeJwtPayload(jwt: string): JwtPayload {
  const parts = jwt.split('.');
  const payload = parts[1];
  if (parts.length !== 3 || !payload) {
    throw new Error('Invalid JWT format');
  }

  // Handle base64url encoding (replace - with +, _ with /)
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);

  const decoded = Buffer.from(padded, 'base64').toString('utf8');
  return JSON.parse(decoded);
}

export interface SapienConfig {
  /** Direct Sapien API host (from API settings or env) */
  host?: string;
  /** Gatekeeper host for JWT requests */
  gatekeeperHost?: string;
  /** Organization ID in Natterbox (from API settings, JWT, or env) */
  organizationId?: number;
  /** Current Natterbox user ID */
  userId?: number;
}

/**
 * Get the API settings from Salesforce
 * These are cached to avoid repeated calls
 * 
 * @param instanceUrl - Salesforce instance URL
 * @param accessToken - Salesforce access token
 * @returns API settings from API_v1__c custom setting
 */
export async function getApiSettings(
  instanceUrl: string,
  accessToken: string
): Promise<NatterboxApiSettings> {
  // Check cache first
  if (cachedApiSettings && cachedApiSettings.expiresAt > new Date()) {
    return cachedApiSettings.settings;
  }

  try {
    const settings = await fetchApiSettings(instanceUrl, accessToken);

    // Cache the settings
    cachedApiSettings = {
      settings,
      expiresAt: new Date(Date.now() + API_SETTINGS_CACHE_TTL_MS),
    };

    return settings;
  } catch (error) {
    console.error('[Sapien] Failed to fetch API settings:', error);
    throw error;
  }
}

/**
 * Get Sapien configuration
 * Priority order:
 * 1. Cached API settings from Salesforce
 * 2. JWT payload (org ID, user ID)
 * 3. Environment variables (fallback)
 */
export function getSapienConfig(): SapienConfig {
  // Try to get from cached API settings
  const apiSettings = cachedApiSettings?.settings;

  // Try to get org ID from cached JWT
  const jwtOrgId = getSapienOrganizationId();
  const jwtUserId = getSapienUserId();

  // Environment fallbacks
  const envOrgId = env.SAPIEN_ORGANIZATION_ID ? parseInt(env.SAPIEN_ORGANIZATION_ID, 10) : undefined;

  return {
    host: apiSettings?.Host__c || env.SAPIEN_HOST || undefined,
    gatekeeperHost: apiSettings?.Gatekeeper_Host__c || SAPIEN_HOSTS.production.gatekeeper,
    organizationId: apiSettings?.OrganizationId__c ?? jwtOrgId ?? envOrgId,
    userId: jwtUserId ?? undefined,
  };
}

/**
 * Check if direct Sapien API is configured
 * Requires: host (from API settings or env) and organizationId (from API settings, JWT, or env)
 */
export function isSapienDirectConfigured(): boolean {
  const config = getSapienConfig();
  return !!(config.host && config.organizationId);
}

/**
 * Get cached API settings (if available)
 * This is useful for getting host URLs without making another request
 */
export function getCachedApiSettings(): NatterboxApiSettings | null {
  if (!cachedApiSettings || cachedApiSettings.expiresAt <= new Date()) {
    return null;
  }
  return cachedApiSettings.settings;
}

/**
 * Clear the API settings cache
 */
export function clearApiSettingsCache(): void {
  cachedApiSettings = null;
  console.log('[Sapien] API settings cache cleared');
}

// Namespace prefix for the managed package
const APEX_REST_NAMESPACE = env.SALESFORCE_PACKAGE_NAMESPACE || 'nbavs';

// Cached Sapien session (access token for calling Gatekeeper)
let cachedSapienSession: { accessToken: string; expiresAt: Date } | null = null;

// Session refresh margin in minutes (refresh if expiring within this window)
const SESSION_REFRESH_MARGIN_MINUTES = 5;

/**
 * Sapien session data from Session_v1__c custom setting
 */
interface SapienSessionData {
  accessToken: string;
  tokenType?: string;
  refreshToken?: string;
  scope?: string;
  expiresAt?: Date;
}

/**
 * Get the Sapien session (access token) from Salesforce Session_v1__c custom setting
 * This is the token used to authenticate with Gatekeeper
 */
async function getSapienSession(
  instanceUrl: string,
  accessToken: string
): Promise<SapienSessionData> {
  // Check cache first
  if (cachedSapienSession && cachedSapienSession.expiresAt > new Date(Date.now() + SESSION_REFRESH_MARGIN_MINUTES * 60 * 1000)) {
    console.log('[Sapien] Using cached Sapien session');
    return { accessToken: cachedSapienSession.accessToken };
  }

  console.log('[Sapien] Fetching Sapien session from Session_v1__c...');

  // Query the Session_v1__c org defaults custom setting
  const soql = `SELECT ${APEX_REST_NAMESPACE}__AccessToken__c, ${APEX_REST_NAMESPACE}__TokenType__c, ${APEX_REST_NAMESPACE}__Expires__c FROM ${APEX_REST_NAMESPACE}__Session_v1__c`;
  const url = `${instanceUrl}/services/data/v62.0/query?q=${encodeURIComponent(soql)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Sapien] Failed to query Session_v1__c: ${response.status} - ${errorText}`);
    throw new Error(`Failed to get Sapien session: ${response.status}`);
  }

  const result = await response.json();

  if (!result.records || result.records.length === 0) {
    throw new Error('No Sapien session found in Session_v1__c');
  }

  const record = result.records[0];
  const sapienAccessToken = record[`${APEX_REST_NAMESPACE}__AccessToken__c`];
  const expiresStr = record[`${APEX_REST_NAMESPACE}__Expires__c`];

  if (!sapienAccessToken) {
    throw new Error('Sapien access token is empty in Session_v1__c');
  }

  console.log('[Sapien] Sapien session retrieved successfully');

  // Parse expiration date
  let expiresAt: Date | undefined;
  if (expiresStr) {
    expiresAt = new Date(expiresStr);
    console.log('[Sapien] Session expires at:', expiresAt.toISOString());
  }

  // Cache the session
  if (expiresAt) {
    cachedSapienSession = {
      accessToken: sapienAccessToken,
      expiresAt,
    };
  }

  return {
    accessToken: sapienAccessToken,
    tokenType: record[`${APEX_REST_NAMESPACE}__TokenType__c`],
    expiresAt,
  };
}

/**
 * Get the current user's Natterbox User ID from User__c
 */
async function getNatterboxUserId(
  instanceUrl: string,
  accessToken: string,
  salesforceUserId: string
): Promise<number> {
  console.log(`[Sapien] Looking up Natterbox user for SF user: ${salesforceUserId}`);

  const soql = `SELECT ${APEX_REST_NAMESPACE}__Id__c FROM ${APEX_REST_NAMESPACE}__User__c WHERE ${APEX_REST_NAMESPACE}__User__c = '${salesforceUserId}' LIMIT 1`;
  const url = `${instanceUrl}/services/data/v62.0/query?q=${encodeURIComponent(soql)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Sapien] Failed to query User__c: ${response.status} - ${errorText}`);
    throw new Error(`Failed to get Natterbox user: ${response.status}`);
  }

  const result = await response.json();

  if (!result.records || result.records.length === 0) {
    throw new Error('Current user does not have a Natterbox User record');
  }

  const natterboxId = result.records[0][`${APEX_REST_NAMESPACE}__Id__c`];
  console.log(`[Sapien] Natterbox user ID: ${natterboxId}`);

  return parseInt(natterboxId, 10);
}

/**
 * Get a Sapien JWT by calling Gatekeeper directly
 * 
 * This bypasses the Apex REST endpoint which has URL-encoding issues with the scope.
 * Instead, we:
 * 1. Get the Sapien access token from Session_v1__c
 * 2. Get the API settings (org ID, gatekeeper host) from API_v1__c
 * 3. Get the current user's Natterbox User ID from User__c
 * 4. Call Gatekeeper directly with properly formatted scope
 * 
 * @param instanceUrl - Salesforce instance URL
 * @param accessToken - Salesforce access token from OAuth
 * @param scope - Sapien scope (e.g., 'enduser:basic', 'routing-policies:admin')
 * @param salesforceUserId - Current Salesforce user ID (for looking up Natterbox user)
 * @returns Sapien JWT token
 */
export async function getSapienJwtDirect(
  instanceUrl: string,
  accessToken: string,
  scope: string = 'enduser:basic',
  salesforceUserId?: string
): Promise<string> {
  // Check cache first - also verify the JWT payload actually has the expected scope
  // (the old Apex method returns JWTs with empty scopes due to URL encoding issues)
  const cachedPayloadScope = cachedJwt?.payload?.scope;
  const isCacheValid = cachedJwt &&
    cachedJwt.scope === scope &&
    cachedJwt.expiresAt > new Date() &&
    cachedPayloadScope && cachedPayloadScope.length > 0;

  if (isCacheValid) {
    console.log(`[Sapien Direct] Using cached JWT for scope: ${scope}`);
    return cachedJwt!.token;
  }

  // Clear cache if it has an invalid/empty scope (from broken Apex method)
  if (cachedJwt && (!cachedPayloadScope || cachedPayloadScope.length === 0)) {
    console.log('[Sapien Direct] Clearing cached JWT with empty scope');
    cachedJwt = null;
  }

  console.log(`[Sapien Direct] Requesting JWT for scope: ${scope}`);

  // Fetch API settings if not cached or if cached settings are missing required fields
  let apiSettings = getCachedApiSettings();
  if (!apiSettings || !apiSettings.OrganizationId__c) {
    try {
      // Clear any stale cache first (both sapien and salesforce caches)
      if (cachedApiSettings || !apiSettings?.OrganizationId__c) {
        console.log('[Sapien Direct] Cached API settings missing OrganizationId, clearing all caches...');
        clearApiSettingsCache();
        clearSalesforceApiSettingsCache(); // Also clear the salesforce cache
      }
      console.log('[Sapien Direct] Fetching API settings from Salesforce...');
      apiSettings = await getApiSettings(instanceUrl, accessToken);
      console.log('[Sapien Direct] API settings fetched. OrganizationId:', apiSettings?.OrganizationId__c);
    } catch (error) {
      console.warn('[Sapien Direct] Failed to fetch API settings:', error);
    }
  }

  // Get required data
  const gatekeeperHost = apiSettings?.Gatekeeper_Host__c || SAPIEN_HOSTS.production.gatekeeper;
  const organizationId = apiSettings?.OrganizationId__c;

  console.log('[Sapien Direct] Using gatekeeperHost:', gatekeeperHost);
  console.log('[Sapien Direct] Using organizationId:', organizationId);

  if (!organizationId) {
    console.error('[Sapien Direct] API settings dump:', JSON.stringify(apiSettings, null, 2));
    throw new Error('Organization ID not found in API settings');
  }

  // Get Sapien session (access token for Gatekeeper)
  const sapienSession = await getSapienSession(instanceUrl, accessToken);

  // Get Natterbox user ID for the current user
  let natterboxUserId: number;
  if (salesforceUserId) {
    natterboxUserId = await getNatterboxUserId(instanceUrl, accessToken, salesforceUserId);
  } else {
    // Try to get user ID from existing cached JWT
    const existingUserId = getSapienUserId();
    if (existingUserId) {
      natterboxUserId = existingUserId;
    } else {
      throw new Error('Salesforce user ID required to look up Natterbox user');
    }
  }

  // Build Gatekeeper URL with properly formatted scope
  // The scope is passed as a query parameter and must be URL-encoded
  const gatekeeperUrl = `${gatekeeperHost}/token/sapien/organisation/${organizationId}/user/${natterboxUserId}?scope=${encodeURIComponent(scope)}`;

  console.log(`[Sapien Direct] Calling Gatekeeper: ${gatekeeperUrl}`);

  // Call Gatekeeper with Sapien access token
  const response = await fetch(gatekeeperUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${sapienSession.accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Sapien Direct] Gatekeeper request failed: ${response.status} - ${errorText}`);
    throw new Error(`Gatekeeper error: ${response.status} - ${errorText}`);
  }

  const responseData = await response.json();
  console.log('[Sapien Direct] Gatekeeper response received');

  const jwt = responseData.jwt;
  if (!jwt) {
    console.error('[Sapien Direct] No JWT in Gatekeeper response:', JSON.stringify(responseData).slice(0, 200));
    throw new Error('No JWT in Gatekeeper response');
  }

  // Decode the JWT to extract payload
  const payload = decodeJwtPayload(jwt);

  console.log('[Sapien Direct] JWT decoded successfully');
  console.log('[Sapien Direct] JWT payload claims:', JSON.stringify(payload, null, 2));
  console.log('[Sapien Direct] Scope in JWT:', payload.scope);

  // Use JWT expiration if available
  let expiresAt: Date;
  if (payload.exp) {
    expiresAt = new Date((payload.exp - 60) * 1000);
    console.log('[Sapien Direct] JWT expires at:', expiresAt.toISOString());
  } else {
    expiresAt = new Date(Date.now() + JWT_LIFETIME_SECONDS * 1000);
    console.log('[Sapien Direct] Using default JWT expiry');
  }

  // Cache the JWT
  cachedJwt = {
    token: jwt,
    expiresAt,
    scope,
    payload,
  };

  return jwt;
}

/**
 * Get a Sapien JWT by calling the Salesforce Apex REST endpoint
 * 
 * NOTE: This method has a known issue where the scope gets URL-encoded in transit,
 * resulting in empty scopes in the returned JWT. Use getSapienJwtDirect() instead.
 * 
 * @deprecated Use getSapienJwtDirect() which calls Gatekeeper directly
 */
export async function getSapienJwt(
  instanceUrl: string,
  accessToken: string,
  scope: string = 'enduser:basic',
  fetchSettings: boolean = true
): Promise<string> {
  // Check cache first
  if (cachedJwt && cachedJwt.scope === scope && cachedJwt.expiresAt > new Date()) {
    console.log(`[Sapien] Using cached JWT for scope: ${scope}`);
    return cachedJwt.token;
  }

  // Optionally fetch API settings first (to populate cache with host URLs)
  if (fetchSettings && !cachedApiSettings) {
    try {
      console.log('[Sapien] Fetching API settings from Salesforce...');
      await getApiSettings(instanceUrl, accessToken);
    } catch (error) {
      console.warn('[Sapien] Failed to fetch API settings (continuing without them):', error);
    }
  }

  // Call the Apex REST endpoint (in the nbavs managed package)
  // This endpoint is: ApexRestTokenRetrieval.cls with URL mapping /token/*
  // It calls CTIRemoting.getAuthToken(scope) → AuthGatekeeper.getAuthToken(scope)
  // 
  // WARNING: The scope gets URL-encoded somewhere in the HTTP request chain,
  // and the Apex code doesn't URL-decode it before passing to Gatekeeper.
  // This results in Gatekeeper receiving 'enduser%3Abasic' instead of 'enduser:basic'.
  // Use getSapienJwtDirect() instead.
  const url = `${instanceUrl}/services/apexrest/${APEX_REST_NAMESPACE}/token/${scope}`;

  console.log(`[Sapien] Requesting JWT for scope: ${scope}`);
  console.log(`[Sapien] Full endpoint URL: ${url}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Sapien] JWT request failed: ${response.status} - ${errorText}`);
    throw new Error(`Failed to get Sapien JWT: ${response.status} - ${errorText}`);
  }

  const responseText = await response.text();
  console.log('[Sapien] JWT response received');
  console.log('[Sapien] Raw response (first 500 chars):', responseText.slice(0, 500));

  // Response is JSON: {"jwt":"..."}
  // This is the raw response from AuthGatekeeper.getAuthToken which returns Gatekeeper's response
  let jwt: string;
  try {
    const data = JSON.parse(responseText);
    jwt = data.jwt;
    if (!jwt) {
      throw new Error('No JWT in response');
    }
  } catch (e) {
    console.error('[Sapien] Invalid JWT response:', responseText.slice(0, 200));
    throw new Error(`Invalid JWT response: ${responseText}`);
  }

  // Decode the JWT to extract payload (org ID, user ID, expiration, etc.)
  const payload = decodeJwtPayload(jwt);

  console.log('[Sapien] JWT decoded successfully');
  console.log('[Sapien] JWT payload claims:', JSON.stringify(payload, null, 2));
  console.log('[Sapien] Organization ID from JWT:', getNbClaim(payload, 'orgId'));
  console.log('[Sapien] User ID from JWT:', getNbClaim(payload, 'userId'));
  console.log('[Sapien] Scope (top-level):', payload.scope);
  console.log('[Sapien] Scope (namespaced):', getNbClaim(payload, 'scope'));

  // Use JWT expiration if available, otherwise use default
  let expiresAt: Date;
  if (payload.exp) {
    // exp is Unix timestamp in seconds, subtract margin for safety
    expiresAt = new Date((payload.exp - 60) * 1000);
    console.log('[Sapien] JWT expires at:', expiresAt.toISOString());
  } else {
    expiresAt = new Date(Date.now() + JWT_LIFETIME_SECONDS * 1000);
    console.log('[Sapien] Using default JWT expiry');
  }

  // Cache the JWT with decoded payload
  cachedJwt = {
    token: jwt,
    expiresAt,
    scope,
    payload,
  };

  return jwt;
}

/**
 * Get the cached JWT payload (contains org ID, user ID, etc.)
 * Must call getSapienJwt first to populate the cache.
 */
export function getCachedJwtPayload(): JwtPayload | null {
  if (!cachedJwt || cachedJwt.expiresAt <= new Date()) {
    return null;
  }
  return cachedJwt.payload;
}

/**
 * Get the Natterbox organization ID from the cached JWT
 * Must call getSapienJwt first to populate the cache.
 */
export function getSapienOrganizationId(): number | null {
  const payload = getCachedJwtPayload();
  if (!payload) return null;

  const orgId = getNbClaim(payload, 'orgId');
  return orgId ? parseInt(orgId, 10) : null;
}

/**
 * Get the Natterbox user ID from the cached JWT
 * Must call getSapienJwt first to populate the cache.
 */
export function getSapienUserId(): number | null {
  const payload = getCachedJwtPayload();
  if (!payload) return null;

  const userId = getNbClaim(payload, 'userId');
  return userId ? parseInt(userId, 10) : null;
}

/**
 * Get the Natterbox username from the cached JWT
 * Must call getSapienJwt first to populate the cache.
 */
export function getSapienUsername(): string | null {
  const payload = getCachedJwtPayload();
  if (!payload) return null;

  return getNbClaim(payload, 'username') ?? null;
}

/**
 * Clear the cached JWT (useful when user logs out or token expires)
 */
export function clearSapienJwtCache(): void {
  cachedJwt = null;
}

/**
 * Get Sapien URLs from Salesforce (via API settings)
 * These are stored in the API_v1__c custom setting in Salesforce
 */
export interface SapienUrls {
  sapienHost?: string;
  gatekeeperHost?: string;
  wallboardApiHost?: string;
  omniChannelRestHost?: string;
  omniChannelEventsHost?: string;
  omniChannelTemplatesHost?: string;
  omniChannelWebsocketHost?: string;
  routingPolicyEditorHost?: string;
  insightSearchHost?: string;
  callFlowHost?: string;
  generalSettingsHost?: string;
  luminaHost?: string;
  auraHost?: string;
  webPhoneHost?: string;
  licenceApiHost?: string;
  telemetryHost?: string;
}

/**
 * Get Sapien URLs from cached API settings or defaults
 */
export function getSapienUrls(): SapienUrls {
  const apiSettings = getCachedApiSettings();

  if (apiSettings) {
    return {
      sapienHost: apiSettings.Host__c,
      gatekeeperHost: apiSettings.Gatekeeper_Host__c,
      wallboardApiHost: apiSettings.WallboardAPIHost__c,
      omniChannelRestHost: apiSettings.OmniChannelRestHost__c,
      omniChannelEventsHost: apiSettings.OmniChannelEventsHost__c,
      omniChannelTemplatesHost: apiSettings.OmniChannelTemplatesHost__c,
      omniChannelWebsocketHost: apiSettings.OmniChannelWebsocketHost__c,
      routingPolicyEditorHost: apiSettings.RoutingPolicyEditorHost__c,
      insightSearchHost: apiSettings.InsightSearchHost__c,
      callFlowHost: apiSettings.CallFlow_Host__c,
      generalSettingsHost: apiSettings.GeneralSettingsHost__c,
      luminaHost: apiSettings.LuminaHost__c,
      auraHost: apiSettings.AuraHost__c,
      webPhoneHost: apiSettings.WebPhoneHost__c,
      licenceApiHost: apiSettings.LicenceAPIHost__c,
      telemetryHost: apiSettings.TelemetryHost__c,
    };
  }

  // Return defaults if no cached settings
  return {
    sapienHost: env.SAPIEN_HOST || SAPIEN_HOSTS.production.sapien,
    gatekeeperHost: SAPIEN_HOSTS.production.gatekeeper,
    wallboardApiHost: SAPIEN_HOSTS.production.wallboardApi,
    omniChannelRestHost: SAPIEN_HOSTS.production.omniChannelRest,
    omniChannelEventsHost: SAPIEN_HOSTS.production.omniChannelEvents,
    omniChannelTemplatesHost: SAPIEN_HOSTS.production.omniChannelTemplates,
    routingPolicyEditorHost: SAPIEN_HOSTS.production.routingPolicyEditor,
    auraHost: SAPIEN_HOSTS.production.aura,
  };
}

// Known Sapien hosts - production defaults (from Natterbox_API.Production.md-meta.xml)
export const SAPIEN_HOSTS = {
  production: {
    sapien: 'https://sapien.redmatter.com/v1',
    gatekeeper: 'https://gatekeeper.redmatter.pub',
    wallboardApi: 'https://flightdeck.natterbox.net',
    omniChannelRest: 'https://omnichannel-us.natterbox.net',
    omniChannelEvents: 'https://external-events-us.natterbox.net',
    omniChannelTemplates: 'https://message-templates-us.natterbox.net',
    omniChannelWebsocket: 'wss://omnichannelws-us.natterbox.net',
    routingPolicyEditor: 'https://routing-policy-editor.natterbox.net',
    generalSettings: 'https://omnisettings.natterbox.net',
    lumina: 'https://lumina.natterbox.net',
    aura: 'https://aura.natterbox.net',
    webPhone: 'https://webphone.natterbox.net',
    licenceApi: 'https://licence-api.redmatter.pub',
    telemetry: 'https://nbtelemetry-beta.herokuapp.com',
    callFlow: 'https://callflow.redmatter.pub',
    insightSearch: 'https://insight-search.natterbox.net',
  },
  sandbox: {
    sapien: 'https://sapien.redmatter-stage.com/v1',
    gatekeeper: 'https://gatekeeper.redmatter-stage.pub',
    serviceCloudRecording: 'https://byot-audio.redmatter-stage.pub',
  },
} as const;

// ============================================================
// Sapien API Request Functions (using JWT)
// ============================================================

/**
 * Make an authenticated request to the Sapien API
 * 
 * @param sapienHost - Sapien API host URL
 * @param jwt - Sapien JWT token (from getSapienJwt)
 * @param method - HTTP method
 * @param path - API path (e.g., '/organisation/123/call')
 * @param options - Request options
 */
export async function sapienRequest<T = unknown>(
  sapienHost: string,
  jwt: string,
  method: string,
  path: string,
  options: {
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Handle PATCH via POST with override header (Sapien quirk)
  let actualMethod = method.toUpperCase();
  if (actualMethod === 'PATCH') {
    actualMethod = 'POST';
    headers['X-HTTP-Method-Override'] = 'PATCH';
  }

  const endpoint = `${sapienHost}${path.startsWith('/') ? path : '/' + path}`;

  console.log(`[Sapien API] ${actualMethod} ${endpoint}`);

  const fetchOptions: RequestInit = {
    method: actualMethod,
    headers,
  };

  if (options.body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(endpoint, fetchOptions);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sapien API error: ${response.status} - ${errorText}`);
  }

  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  const parsed = JSON.parse(text);
  return parsed.data !== undefined ? parsed.data : parsed;
}

// ============================================================
// High-Level API Functions
// ============================================================

export interface SapienCallStatus {
  id: string;
  uuid: string;
  direction: string;
  state: string;
  from: string;
  to: string;
  startTime: string;
  answerTime?: string;
  user?: string;
}

// ============================================================
// Policy API Functions (Routing Policies)
// ============================================================

/**
 * Policy data returned from Sapien
 */
export interface SapienPolicyData {
  id: number;
  data: {
    name: string;
    enabled: boolean;
    type: string;
    items: Array<{
      id: string;
      name: string;
      templateId: number;
      destinationNumber?: string;
      subItems?: Array<{
        id: string;
        name: string;
        templateId: number;
        destinationNumber?: string;
      }>;
    }>;
  };
}

/**
 * Save (update) an existing policy to Sapien
 * 
 * @param sapienHost - Sapien API host URL (v1 base, e.g., https://api.natterbox.net/v1)
 * @param jwt - Sapien JWT with routing-policies:admin scope
 * @param organizationId - Natterbox organization ID
 * @param policyId - Natterbox policy ID (Id__c in Salesforce, the numeric remote ID)
 * @param policyJson - Policy__c JSON string from buildPayload
 * @returns Updated policy data from Sapien
 */
export async function savePolicyToSapien(
  sapienHost: string,
  jwt: string,
  organizationId: number,
  policyId: number,
  policyJson: string
): Promise<SapienPolicyData> {
  return sapienRequest<SapienPolicyData>(
    sapienHost,
    jwt,
    'PUT',
    `/organisation/${organizationId}/dial-plan/policy-destination-number/${policyId}`,
    { body: JSON.parse(policyJson) }
  );
}

/**
 * Create a new policy in Sapien
 * 
 * @param sapienHost - Sapien API host URL
 * @param jwt - Sapien JWT with routing-policies:admin scope
 * @param organizationId - Natterbox organization ID
 * @param policyJson - Policy__c JSON string from buildPayload
 * @returns Created policy data from Sapien (includes the new ID)
 */
export async function createPolicyInSapien(
  sapienHost: string,
  jwt: string,
  organizationId: number,
  policyJson: string
): Promise<SapienPolicyData> {
  return sapienRequest<SapienPolicyData>(
    sapienHost,
    jwt,
    'POST',
    `/organisation/${organizationId}/dial-plan/policy-destination-number`,
    { body: JSON.parse(policyJson) }
  );
}

/**
 * Delete a policy from Sapien
 * 
 * @param sapienHost - Sapien API host URL
 * @param jwt - Sapien JWT with routing-policies:admin scope
 * @param organizationId - Natterbox organization ID
 * @param policyId - Natterbox policy ID (Id__c in Salesforce)
 * @returns true if successful
 */
export async function deletePolicyFromSapien(
  sapienHost: string,
  jwt: string,
  organizationId: number,
  policyId: number
): Promise<boolean> {
  await sapienRequest(
    sapienHost,
    jwt,
    'DELETE',
    `/organisation/${organizationId}/dial-plan/policy/${policyId}`
  );
  return true;
}

/**
 * Get active calls from Sapien API
 * 
 * Requires: Sapien JWT with appropriate scope, Sapien host URL, Organization ID
 */
export async function getActiveCalls(
  sapienHost: string,
  jwt: string,
  organizationId: number
): Promise<SapienCallStatus[]> {
  return sapienRequest<SapienCallStatus[]>(
    sapienHost,
    jwt,
    'GET',
    `/organisation/${organizationId}/call`
  );
}

/**
 * Get call recording URL
 * Note: Actual playback may require additional auth or streaming endpoint
 */
export function getRecordingUrl(
  sapienHost: string,
  organizationId: number,
  uuid: string
): string {
  return `${sapienHost}/organisation/${organizationId}/recording/${uuid}`;
}

// ============================================================
// Available Sapien Scopes (from Salesforce code)
// ============================================================

export const SAPIEN_SCOPES = {
  /** Basic end-user access (CTI, calls) */
  ENDUSER_BASIC: 'enduser:basic',

  /** Omni-channel basic access */
  OMNI_BASIC: 'omni:basic',

  /** Omni-channel team leader access */
  OMNI_TEAM_LEADER: 'omni:team-leader',

  /** Omni-channel admin access */
  OMNI_ADMIN: 'omni:admin',

  /** Insights basic access */
  INSIGHTS_BASIC: 'insights:basic',

  /** Insights team leader access */
  INSIGHTS_TEAM_LEADER: 'insights:team-leader',

  /** Insights admin access */
  INSIGHTS_ADMIN: 'insights:admin',

  /** Templates basic access */
  TEMPLATES_BASIC: 'templates:basic',

  /** Templates team leader access */
  TEMPLATES_TEAM_LEADER: 'templates:team-leader',

  /** Templates admin access */
  TEMPLATES_ADMIN: 'templates:admin',

  /** Flightdeck (Wallboard) basic access */
  FLIGHTDECK_BASIC: 'flightdeck:basic',

  /** Flightdeck (Wallboard) team leader access */
  FLIGHTDECK_TEAM_LEADER: 'flightdeck:team-leader',

  /** Flightdeck (Wallboard) admin access */
  FLIGHTDECK_ADMIN: 'flightdeck:admin',

  /** Routing policies admin access */
  ROUTING_POLICIES_ADMIN: 'routing-policies:admin',

  /** Full AVS API access (restricted - cannot be requested by end users) */
  AVS_API: 'avs:api', // Note: This scope is restricted in AuthGatekeeper
} as const;

// ============================================================
// Helper to check if JWT retrieval is available
// ============================================================

/**
 * Check if we can get a Sapien JWT (requires valid Salesforce session)
 */
export function canGetSapienJwt(locals: App.Locals): boolean {
  return !!(locals.accessToken && locals.instanceUrl);
}

// ============================================================
// Call Logs API Functions
// ============================================================

/**
 * Call log entry from Sapien API
 */
export interface SapienCallLog {
  id?: number;
  fromUserId?: number;
  toUserId?: number;
  fromSipDeviceId?: number;
  toSipDeviceId?: number;
  fromNumber?: string;
  toNumber?: string;
  toNumberDialled?: string;
  direction?: string;
  timeStart?: string;
  timeHunting?: number;
  timeRinging?: number;
  timeTalking?: number;
  aUuid?: string;
  bUuid?: string;
  aFlags?: string[];
  bFlags?: string[];
}

/**
 * Fetch call logs for a user from Sapien API
 * 
 * @param sapienHost - Sapien API host URL (e.g., https://gatekeeper.redmatter.pub)
 * @param jwt - Sapien JWT with enduser:basic scope
 * @param organizationId - Natterbox organization ID
 * @param userId - Natterbox user ID (Id__c from User__c)
 * @param limit - Maximum number of records to return (default: 10)
 * @returns Array of call log entries
 */
export async function getCallLogs(
  sapienHost: string,
  jwt: string,
  organizationId: number,
  userId: number,
  limit: number = 10
): Promise<SapienCallLog[]> {
  const path = `/organisation/${organizationId}/log/call?user-id=${userId}&_limit=${limit}`;

  try {
    const response = await sapienRequest<SapienCallLog[]>(
      sapienHost,
      jwt,
      'GET',
      path
    );
    return Array.isArray(response) ? response : [];
  } catch (error) {
    console.error('[Sapien] Failed to fetch call logs:', error);
    return [];
  }
}
