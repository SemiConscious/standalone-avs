/**
 * Sapien API Client for Server-Side Operations
 * 
 * This module provides server-side access to the Natterbox Sapien API.
 * 
 * Authentication Flow:
 * 1. User authenticates with Salesforce OAuth → SF access token
 * 2. We call the Apex REST endpoint /services/apexrest/token/{scope} with SF token
 * 3. Salesforce internally authenticates with Sapien using stored credentials
 * 4. Salesforce calls Gatekeeper to get a user-specific Sapien JWT
 * 5. We receive the Sapien JWT to make API calls
 * 
 * This approach leverages the existing Salesforce infrastructure and doesn't
 * require separate Sapien credentials for the standalone app.
 */

import { env } from '$env/dynamic/private';

// The Sapien JWT and its expiry (JWTs are typically short-lived)
let cachedJwt: { token: string; expiresAt: Date; scope: string; payload: JwtPayload } | null = null;

// Default JWT lifetime in seconds (5 minutes - conservative estimate)
const JWT_LIFETIME_SECONDS = 300;

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
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }
  
  const payload = parts[1];
  // Handle base64url encoding (replace - with +, _ with /)
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  
  const decoded = Buffer.from(padded, 'base64').toString('utf8');
  return JSON.parse(decoded);
}

export interface SapienConfig {
  /** Direct Sapien API host (optional, for direct API calls) */
  host?: string;
  /** Organization ID in Natterbox (from env or JWT) */
  organizationId?: number;
}

/**
 * Get Sapien configuration
 * - host: from environment variable
 * - organizationId: from JWT payload (preferred) or environment variable (fallback)
 */
export function getSapienConfig(): SapienConfig {
  // Try to get org ID from cached JWT first
  const jwtOrgId = getSapienOrganizationId();
  const envOrgId = env.SAPIEN_ORGANIZATION_ID ? parseInt(env.SAPIEN_ORGANIZATION_ID, 10) : undefined;
  
  return {
    host: env.SAPIEN_HOST || undefined,
    organizationId: jwtOrgId ?? envOrgId,
  };
}

/**
 * Check if direct Sapien API is configured
 * Requires: host (from env) and organizationId (from JWT or env)
 */
export function isSapienDirectConfigured(): boolean {
  const config = getSapienConfig();
  return !!(config.host && config.organizationId);
}

// Namespace prefix for the managed package
const APEX_REST_NAMESPACE = env.SALESFORCE_PACKAGE_NAMESPACE || 'nbavs';

/**
 * Get a Sapien JWT by calling the Salesforce Apex REST endpoint
 * 
 * This is the primary method for getting Sapien access - it uses the user's
 * Salesforce session to get a scoped Sapien JWT via Gatekeeper.
 * 
 * @param instanceUrl - Salesforce instance URL (e.g., https://myorg.my.salesforce.com)
 * @param accessToken - Salesforce access token from OAuth
 * @param scope - Sapien scope (e.g., 'enduser:basic', 'insights:admin')
 * @returns Sapien JWT token
 */
export async function getSapienJwt(
  instanceUrl: string,
  accessToken: string,
  scope: string = 'enduser:basic'
): Promise<string> {
  // Check cache first
  if (cachedJwt && cachedJwt.scope === scope && cachedJwt.expiresAt > new Date()) {
    return cachedJwt.token;
  }

  // Call the Apex REST endpoint (in the nbavs managed package)
  const url = `${instanceUrl}/services/apexrest/${APEX_REST_NAMESPACE}/token/${encodeURIComponent(scope)}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get Sapien JWT: ${response.status} - ${errorText}`);
  }

  const responseText = await response.text();
  
  // Response is JSON: {"jwt":"..."}
  let jwt: string;
  try {
    const data = JSON.parse(responseText);
    jwt = data.jwt;
    if (!jwt) {
      throw new Error('No JWT in response');
    }
  } catch (e) {
    throw new Error(`Invalid JWT response: ${responseText}`);
  }

  // Decode the JWT to extract payload (org ID, user ID, expiration, etc.)
  const payload = decodeJwtPayload(jwt);
  
  // Use JWT expiration if available, otherwise use default
  let expiresAt: Date;
  if (payload.exp) {
    // exp is Unix timestamp in seconds, subtract margin for safety
    expiresAt = new Date((payload.exp - 60) * 1000);
  } else {
    expiresAt = new Date(Date.now() + JWT_LIFETIME_SECONDS * 1000);
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
 * Get Sapien URLs from Salesforce (via remote action or API settings)
 * These are stored in the API_v1__c custom setting in Salesforce
 */
export interface SapienUrls {
  sapienHost?: string;
  gatekeeperHost?: string;
  wallboardApiHost?: string;
  omniChannelRestHost?: string;
  routingPolicyEditorHost?: string;
  insightSearchHost?: string;
  callFlowHost?: string;
}

// Known Sapien hosts (from TestCommon.cls)
export const SAPIEN_HOSTS = {
  production: {
    gatekeeper: 'https://gatekeeper.redmatter.pub',
    omniChannelRest: 'https://omnichannel-us.natterbox.net',
    omniChannelEvents: 'https://external-events-us.natterbox.net',
    omniChannelTemplates: 'https://message-templates-us.natterbox.net',
    routingPolicyEditor: 'https://routing-policy-editor.natterbox.net',
    aura: 'https://aura.natterbox.net',
  },
  sandbox: {
    gatekeeper: 'https://gatekeeper.redmatter-stage.pub',
    serviceCloudRecording: 'byot-audio.redmatter-stage.pub',
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
