/**
 * Gatekeeper Authentication Client for Svelte
 * 
 * This is a port of the Salesforce Apex AuthGatekeeper/RestClient code.
 * It authenticates with Sapien using OAuth password grant, then calls
 * Gatekeeper to get a JWT for the specified scope.
 * 
 * Flow:
 * 1. Get API settings from Salesforce (ApexRestProtectedSettings endpoint)
 * 2. Decrypt the stored password using AES256
 * 3. Authenticate with Sapien OAuth (password grant)
 * 4. Call Gatekeeper with the access token to get a JWT
 */

import { createDecipheriv } from 'crypto';

// ============================================================
// Types
// ============================================================

export interface ApiSettings {
  ClientId__c?: string;
  ClientSecret__c?: string;
  Username__c?: string;
  Password__c?: string;  // Encrypted
  Key__c?: string;       // AES256 encryption key (base64)
  Host__c?: string;      // Sapien API host
  Gatekeeper_Host__c?: string;
  OrganizationId__c?: number;
  // Add any other fields we need
  [key: string]: unknown;
}

interface SapienSession {
  accessToken: string;
  tokenType: string;
  refreshToken?: string;
  scope?: string;
  expiresAt: Date;
}

interface JwtPayload {
  'https://natterbox.com/claim/orgId'?: string;
  'https://natterbox.com/claim/userId'?: string;
  'https://natterbox.com/claim/username'?: string;
  scope?: string;
  exp?: number;
  [key: string]: unknown;
}

// ============================================================
// Cache
// ============================================================

let cachedApiSettings: ApiSettings | null = null;
let cachedSapienSession: SapienSession | null = null;
let cachedJwt: { token: string; scope: string; expiresAt: Date; payload: JwtPayload } | null = null;

// Session refresh margin (minutes) - refresh if expiring within this window
const SESSION_REFRESH_MARGIN_MINUTES = 5;

// ============================================================
// API Settings
// ============================================================

/**
 * Fetch API settings from Salesforce via ApexRestProtectedSettings endpoint
 */
export async function fetchApiSettings(
  instanceUrl: string,
  accessToken: string
): Promise<ApiSettings> {
  if (cachedApiSettings) {
    return cachedApiSettings;
  }

  const url = `${instanceUrl}/services/apexrest/nbavs/HostUrlSettings/APISettings`;
  
  console.log('[Gatekeeper] Fetching API settings from:', url);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Gatekeeper] Failed to fetch API settings:', response.status, errorText);
    throw new Error(`Failed to fetch API settings: ${response.status}`);
  }

  const rawSettings = await response.json();
  
  // Normalize field names: strip namespace prefix (e.g., nbavs__Field__c -> Field__c)
  const settings: ApiSettings = {};
  for (const [key, value] of Object.entries(rawSettings)) {
    settings[key] = value;
    const normalizedKey = key.replace(/^[a-zA-Z0-9]+__/, '');
    if (normalizedKey !== key) {
      settings[normalizedKey] = value;
    }
  }

  console.log('[Gatekeeper] API settings fetched successfully');
  console.log('[Gatekeeper] Host:', settings.Host__c);
  console.log('[Gatekeeper] Gatekeeper Host:', settings.Gatekeeper_Host__c);
  console.log('[Gatekeeper] Organization ID:', settings.OrganizationId__c);
  console.log('[Gatekeeper] All API settings keys:', Object.keys(settings).filter(k => !k.startsWith('nbavs__')).join(', '));

  cachedApiSettings = settings;
  return settings;
}

/**
 * Get cached API settings
 */
export function getCachedApiSettings(): ApiSettings | null {
  return cachedApiSettings;
}

/**
 * Clear API settings cache
 */
export function clearApiSettingsCache(): void {
  cachedApiSettings = null;
  console.log('[Gatekeeper] API settings cache cleared');
}

// ============================================================
// Decryption
// ============================================================

/**
 * Decrypt a string using AES256 with managed IV
 * 
 * Port of Salesforce Encryption.decryptString()
 * - The encrypted data is base64 encoded
 * - First 16 bytes of decoded data are the IV
 * - Remaining bytes are the ciphertext
 * - Key is base64 encoded AES256 key
 * 
 * Note: Uses AES-256-CBC to match Salesforce's Crypto.decryptWithManagedIV format.
 * The CBC mode without additional integrity check is required for compatibility
 * with the existing Salesforce encryption. The encrypted password is stored in
 * Salesforce and we must use the same algorithm to decrypt it.
 */
export function decryptString(encryptedValue: string, key: string): string {
  try {
    // Decode the encrypted value and key from base64
    const encryptedBuffer = Buffer.from(encryptedValue, 'base64');
    const keyBuffer = Buffer.from(key, 'base64');

    // First 16 bytes are the IV (managed IV)
    const iv = encryptedBuffer.subarray(0, 16);
    const ciphertext = encryptedBuffer.subarray(16);

    // Create decipher and decrypt
    const decipher = createDecipheriv('aes-256-cbc', keyBuffer, iv);
    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  } catch (error) {
    console.error('[Gatekeeper] Decryption failed:', error);
    // Return original value on failure (matches Apex behavior)
    return encryptedValue;
  }
}

// ============================================================
// Sapien OAuth
// ============================================================

/**
 * Authenticate with Sapien using OAuth password grant
 * 
 * Port of Salesforce RestClient.doAuth()
 */
export async function authenticateWithSapien(settings: ApiSettings): Promise<SapienSession> {
  // Check cache first
  if (cachedSapienSession) {
    const refreshThreshold = new Date(Date.now() + SESSION_REFRESH_MARGIN_MINUTES * 60 * 1000);
    if (cachedSapienSession.expiresAt > refreshThreshold) {
      console.log('[Gatekeeper] Using cached Sapien session');
      return cachedSapienSession;
    }
    console.log('[Gatekeeper] Cached session expired or expiring soon, re-authenticating...');
  }

  // Validate required settings
  if (!settings.ClientId__c || !settings.ClientSecret__c || 
      !settings.Username__c || !settings.Password__c || !settings.Key__c || !settings.Host__c) {
    throw new Error('Missing required API settings for Sapien authentication');
  }

  // Decrypt the password
  const decryptedPassword = decryptString(settings.Password__c, settings.Key__c);
  
  console.log('[Gatekeeper] Authenticating with Sapien...');

  // Build OAuth request body
  const body = new URLSearchParams({
    client_id: settings.ClientId__c,
    client_secret: settings.ClientSecret__c,
    grant_type: 'password',
    username: settings.Username__c,
    password: decryptedPassword,
  });

  // POST to Sapien auth endpoint
  // Remove trailing slash from Host__c if present
  const sapienHost = settings.Host__c!.replace(/\/+$/, '');
  const authUrl = `${sapienHost}/auth/token`;
  console.log('[Gatekeeper] Auth URL:', authUrl);

  const response = await fetch(authUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Gatekeeper] Sapien auth failed:', response.status, errorText);
    throw new Error(`Sapien authentication failed: ${response.status} - ${errorText}`);
  }

  const authResult = await response.json();
  
  console.log('[Gatekeeper] Sapien authentication successful');
  console.log('[Gatekeeper] Sapien session response:', JSON.stringify({
    scope: authResult.scope,
    token_type: authResult.token_type,
    expires_in: authResult.expires_in,
    access_token_length: authResult.access_token?.length,
    access_token_first_50: authResult.access_token?.slice(0, 50),
  }));

  // Cache the session
  const session: SapienSession = {
    accessToken: authResult.access_token,
    tokenType: authResult.token_type,
    refreshToken: authResult.refresh_token,
    scope: authResult.scope,
    expiresAt: new Date(Date.now() + (authResult.expires_in - 60) * 1000), // 60s margin
  };

  cachedSapienSession = session;
  return session;
}

/**
 * Clear Sapien session cache
 */
export function clearSapienSessionCache(): void {
  cachedSapienSession = null;
  console.log('[Gatekeeper] Sapien session cache cleared');
}

// ============================================================
// Gatekeeper JWT
// ============================================================

/**
 * Decode a JWT payload without verification
 */
function decodeJwtPayload(jwt: string): JwtPayload {
  const parts = jwt.split('.');
  if (parts.length !== 3 || !parts[1]) {
    throw new Error('Invalid JWT format');
  }

  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  const decoded = Buffer.from(padded, 'base64').toString('utf8');
  return JSON.parse(decoded);
}

/**
 * Get Natterbox user ID for a Salesforce user
 */
export async function getNatterboxUserId(
  instanceUrl: string,
  accessToken: string,
  salesforceUserId: string
): Promise<number> {
  console.log(`[Gatekeeper] Looking up Natterbox user for SF user: ${salesforceUserId}`);

  const soql = `SELECT nbavs__Id__c FROM nbavs__User__c WHERE nbavs__User__c = '${salesforceUserId}' LIMIT 1`;
  const url = `${instanceUrl}/services/data/v62.0/query?q=${encodeURIComponent(soql)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Gatekeeper] Failed to query User__c: ${response.status} - ${errorText}`);
    throw new Error(`Failed to get Natterbox user: ${response.status}`);
  }

  const result = await response.json();

  if (!result.records || result.records.length === 0) {
    throw new Error('Current user does not have a Natterbox User record');
  }

  const natterboxId = result.records[0].nbavs__Id__c;
  console.log(`[Gatekeeper] Natterbox user ID: ${natterboxId}`);

  return parseInt(natterboxId, 10);
}

/**
 * Get a JWT from Gatekeeper
 * 
 * This is the main entry point - it handles the full flow:
 * 1. Get API settings
 * 2. Authenticate with Sapien
 * 3. Call Gatekeeper to get JWT
 * 
 * Port of Salesforce AuthGatekeeper.getAuthToken()
 */
export async function getJwt(
  instanceUrl: string,
  sfAccessToken: string,
  scope: string,
  salesforceUserId: string
): Promise<string> {
  // Check cache first - ensure the cached JWT actually has the expected scope
  if (cachedJwt && cachedJwt.scope === scope && cachedJwt.expiresAt > new Date()) {
    // Verify the JWT payload actually contains a scope (not empty)
    if (cachedJwt.payload.scope && cachedJwt.payload.scope.length > 0) {
      console.log(`[Gatekeeper] Using cached JWT for scope: ${scope}`);
      return cachedJwt.token;
    } else {
      console.log('[Gatekeeper] Cached JWT has empty scope, clearing all caches...');
      cachedJwt = null;
      cachedSapienSession = null;  // Force re-auth with Sapien
    }
  }

  console.log(`[Gatekeeper] Getting JWT for scope: ${scope}`);

  // Step 1: Get API settings
  const settings = await fetchApiSettings(instanceUrl, sfAccessToken);

  if (!settings.OrganizationId__c) {
    throw new Error('Organization ID not found in API settings');
  }

  if (!settings.Gatekeeper_Host__c) {
    throw new Error('Gatekeeper host not found in API settings');
  }

  // Step 2: Authenticate with Sapien
  const sapienSession = await authenticateWithSapien(settings);

  // Step 3: Get Natterbox user ID
  const natterboxUserId = await getNatterboxUserId(instanceUrl, sfAccessToken, salesforceUserId);

  // Step 4: Call Gatekeeper
  // IMPORTANT: The scope must NOT be URL-encoded. Gatekeeper expects the raw scope value.
  // The Apex code does: '?scope=' + scope (no encoding)
  const gatekeeperUrl = `${settings.Gatekeeper_Host__c}/token/sapien/organisation/${settings.OrganizationId__c}/user/${natterboxUserId}?scope=${scope}`;

  console.log(`[Gatekeeper] Calling Gatekeeper: ${gatekeeperUrl}`);

  const response = await fetch(gatekeeperUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${sapienSession.accessToken}`,
      'Accept': 'application/json',
    },
  });

  const responseText = await response.text();
  console.log(`[Gatekeeper] Raw response: ${responseText.slice(0, 500)}`);

  if (!response.ok) {
    console.error(`[Gatekeeper] Gatekeeper request failed: ${response.status} - ${responseText}`);
    throw new Error(`Gatekeeper error: HTTP status ${response.status}: ${responseText}`);
  }

  const responseData = JSON.parse(responseText);
  
  if (!responseData.jwt) {
    throw new Error('No JWT returned by Gatekeeper');
  }

  const jwt = responseData.jwt;

  // Decode and cache
  const payload = decodeJwtPayload(jwt);
  
  console.log('[Gatekeeper] JWT received successfully');
  console.log('[Gatekeeper] JWT payload:', JSON.stringify(payload, null, 2));
  console.log('[Gatekeeper] JWT scope:', payload.scope);

  let expiresAt: Date;
  if (payload.exp) {
    expiresAt = new Date((payload.exp - 60) * 1000);
  } else {
    expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minute default
  }

  cachedJwt = {
    token: jwt,
    scope,
    expiresAt,
    payload,
  };

  return jwt;
}

/**
 * Clear JWT cache
 */
export function clearJwtCache(): void {
  cachedJwt = null;
  console.log('[Gatekeeper] JWT cache cleared');
}

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
  clearApiSettingsCache();
  clearSapienSessionCache();
  clearJwtCache();
  console.log('[Gatekeeper] All caches cleared');
}

/**
 * Get cached JWT payload
 */
export function getCachedJwtPayload(): JwtPayload | null {
  if (!cachedJwt || cachedJwt.expiresAt <= new Date()) {
    return null;
  }
  return cachedJwt.payload;
}

/**
 * Get organization ID from cached JWT or settings
 */
export function getOrganizationId(): number | null {
  const payload = getCachedJwtPayload();
  if (payload?.['https://natterbox.com/claim/orgId']) {
    return parseInt(payload['https://natterbox.com/claim/orgId'], 10);
  }
  if (cachedApiSettings?.OrganizationId__c) {
    return cachedApiSettings.OrganizationId__c;
  }
  return null;
}

/**
 * Get user ID from cached JWT
 */
export function getUserId(): number | null {
  const payload = getCachedJwtPayload();
  if (payload?.['https://natterbox.com/claim/userId']) {
    return parseInt(payload['https://natterbox.com/claim/userId'], 10);
  }
  return null;
}

/**
 * Get the Sapien access token directly (NOT the Gatekeeper JWT).
 * 
 * This is what the Salesforce RestClient uses for general Sapien API calls.
 * Use this for endpoints that don't require a scoped JWT (like call logs).
 * 
 * Returns the raw Sapien OAuth access_token from password grant auth.
 */
export async function getSapienAccessToken(
  instanceUrl: string,
  accessToken: string,
  forceRefresh: boolean = false
): Promise<string> {
  // Ensure we have API settings
  if (!cachedApiSettings) {
    console.log('[Gatekeeper] Fetching API settings for Sapien access token...');
    cachedApiSettings = await fetchApiSettings(instanceUrl, accessToken);
  }

  // Check if we have a valid cached session
  if (!forceRefresh && cachedSapienSession && cachedSapienSession.expiresAt > new Date()) {
    console.log('[Gatekeeper] Using cached Sapien access token');
    return cachedSapienSession.accessToken;
  }

  // Clear cache if forcing refresh
  if (forceRefresh) {
    console.log('[Gatekeeper] Force refresh - clearing Sapien session cache');
    cachedSapienSession = null;
  }

  // Authenticate with Sapien
  console.log('[Gatekeeper] Authenticating with Sapien to get access token...');
  const session = await authenticateWithSapien(cachedApiSettings!);
  
  return session.accessToken;
}

/**
 * Get the cached Sapien host URL (from API settings Host__c)
 */
export function getSapienHost(): string | null {
  return cachedApiSettings?.Host__c?.replace(/\/+$/, '') || null;
}

/**
 * Check if we can make Sapien API calls (have valid credentials cached or can fetch them)
 */
export function canUseSapienApi(locals: App.Locals): boolean {
  return !!(locals.accessToken && locals.instanceUrl);
}

/**
 * Make a direct Sapien API request using the Sapien access token.
 * This is for general Sapien API calls that don't require specific scopes.
 * 
 * @param instanceUrl - Salesforce instance URL (for fetching API settings if needed)
 * @param sfAccessToken - Salesforce access token (for fetching API settings if needed)
 * @param method - HTTP method
 * @param path - API path (will be appended to Sapien host)
 * @param options - Optional request body and headers
 */
export async function sapienApiRequest<T = unknown>(
  instanceUrl: string,
  sfAccessToken: string,
  method: string,
  path: string,
  options: {
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  // Get Sapien access token (this will also cache API settings)
  const sapienToken = await getSapienAccessToken(instanceUrl, sfAccessToken);
  
  const sapienHost = getSapienHost();
  if (!sapienHost) {
    throw new Error('Sapien host not configured');
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${sapienToken}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Handle PATCH via POST with override header (Sapien quirk - same as RestClient)
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
  if (!text || text.trim() === '') {
    return {} as T;
  }
  
  return JSON.parse(text) as T;
}

/**
 * Sapien user details from the API
 */
export interface SapienUser {
  id: number;
  username: string;
  enabled: boolean;
  scopes?: string[];
  // Add other fields as needed
  [key: string]: unknown;
}

/**
 * Fetch user details from Sapien API to see their assigned scopes
 * 
 * This calls: GET /organisation/{orgId}/user/{userId}
 * with the Sapien access token (not the JWT)
 */
export async function getSapienUserDetails(
  organizationId: number,
  userId: number
): Promise<SapienUser> {
  // Need a valid Sapien session
  if (!cachedSapienSession || cachedSapienSession.expiresAt <= new Date()) {
    throw new Error('No valid Sapien session - call getJwt first to authenticate');
  }

  const settings = cachedApiSettings;
  if (!settings?.Host__c) {
    throw new Error('No Sapien host in cached settings');
  }

  const sapienHost = settings.Host__c.replace(/\/+$/, '');
  const url = `${sapienHost}/organisation/${organizationId}/user/${userId}`;

  console.log(`[Gatekeeper] Fetching user details: ${url}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${cachedSapienSession.accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Gatekeeper] Failed to get user details: ${response.status} - ${errorText}`);
    throw new Error(`Failed to get user from Sapien: ${response.status}`);
  }

  const responseData = await response.json();
  
  // Sapien wraps the user in a "data" property
  const userData = responseData.data || responseData;
  
  console.log('[Gatekeeper] User details from Sapien:');
  console.log('[Gatekeeper]   ID:', userData.id);
  console.log('[Gatekeeper]   Username:', userData.userName);
  console.log('[Gatekeeper]   Enabled:', userData.enabled);
  console.log('[Gatekeeper]   Permission Level:', userData.permissionLevel);
  console.log('[Gatekeeper]   Scopes:', JSON.stringify(userData.scopes || 'NOT FOUND'));

  return {
    id: userData.id,
    username: userData.userName,
    enabled: userData.enabled,
    scopes: userData.scopes,
    permissionLevel: userData.permissionLevel,
    ...userData
  };
}

// ============================================================
// License API
// ============================================================

export interface LicenseData {
  Voice__c?: boolean;
  Voice_Count__c?: number;
  ContactCentre__c?: boolean;
  ContactCentre_Count__c?: number;
  Record__c?: boolean;
  Record_Count__c?: number;
  CTI__c?: boolean;
  CTI_Count__c?: number;
  PCI__c?: boolean;
  PCI_Count__c?: number;
  Insights__c?: boolean;
  Insights_Count__c?: number;
  Freedom__c?: boolean;
  Freedom_Count__c?: number;
  ServiceCloudVoice__c?: boolean;
  ServiceCloudVoice_Count__c?: number;
  SMS__c?: boolean;
  SMS_Count__c?: number;
  WhatsApp__c?: boolean;
  WhatsApp_Count__c?: number;
  AIAdvisor__c?: boolean;
  AIAdvisor_Count__c?: number;
  AIAgents__c?: number;
  AIAssistants__c?: number;
  AIAgentsCallAllowance__c?: number;
  AIAssistantsCallAllowance__c?: number;
  AIAgentsDigitalMessageAllowance__c?: number;
  AIAssistantsDigitalMessageAllowance__c?: number;
  PBX__c?: boolean;
  PBX_Count__c?: number;
  Manager__c?: boolean;
  Manager_Count__c?: number;
  Numbers__c?: boolean;
  Numbers_Count__c?: number;
  Global__c?: boolean;
  Global_Count__c?: number;
  AVS_Provisioned__c?: boolean;
  TrialExpirationDate__c?: string;
}

/**
 * Get the Salesforce Organization ID
 */
export async function getSalesforceOrgId(
  instanceUrl: string,
  accessToken: string
): Promise<string> {
  const url = `${instanceUrl}/services/data/v55.0/query?q=SELECT+Id+FROM+Organization+LIMIT+1`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get Salesforce Org ID: ${response.status}`);
  }

  const data = await response.json();
  if (data.records && data.records.length > 0) {
    // Return first 15 characters (standard Salesforce Org ID format)
    return data.records[0].Id.substring(0, 15);
  }
  
  throw new Error('Could not find Salesforce Organization ID');
}

/**
 * Fetch license from Sapien API
 * This mirrors the avs-sfdx APIController.getLicense() method
 */
export async function getLicenseFromSapien(
  instanceUrl: string,
  accessToken: string
): Promise<LicenseData | null> {
  // Ensure we have API settings and Sapien session
  if (!cachedApiSettings) {
    await fetchApiSettings(instanceUrl, accessToken);
  }
  
  const sapienAccessToken = await getSapienAccessToken(instanceUrl, accessToken);
  const sfOrgId = await getSalesforceOrgId(instanceUrl, accessToken);
  
  // Get the base Sapien host (without /v1 suffix for this endpoint)
  const sapienHost = cachedApiSettings?.Host__c?.replace(/\/v1\/?$/, '').replace(/\/+$/, '') || '';
  
  if (!sapienHost) {
    console.error('[Gatekeeper] No Sapien host configured for license fetch');
    return null;
  }

  // The license endpoint is at /extra/license/{sfOrgId}
  const url = `${sapienHost}/extra/license/${sfOrgId}`;
  
  console.log('[Gatekeeper] Fetching license from:', url);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sapienAccessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Gatekeeper] License fetch failed: ${response.status} - ${errorText}`);
      return null;
    }

    const responseBody = await response.json();
    const dataNode = responseBody.data;

    if (!dataNode) {
      console.log('[Gatekeeper] No data in license response');
      return null;
    }

    console.log('[Gatekeeper] License data received:', JSON.stringify(dataNode, null, 2));

    // Map the response to our LicenseData format
    // The API returns data without __c suffix, we map to Salesforce field names for compatibility
    const license: LicenseData = {
      // Voice/PBX
      Voice__c: !!dataNode.Numbers__c || !!dataNode.numbers,
      Voice_Count__c: dataNode.Numbers_Count__c ?? dataNode.numbersCount ?? 0,
      PBX__c: !!dataNode.PBX__c || !!dataNode.pbx,
      PBX_Count__c: dataNode.PBX_Count__c ?? dataNode.pbxCount ?? 0,
      
      // Contact Centre / Manager
      ContactCentre__c: !!dataNode.Manager__c || !!dataNode.manager,
      ContactCentre_Count__c: dataNode.Manager_Count__c ?? dataNode.managerCount ?? 0,
      Manager__c: !!dataNode.Manager__c || !!dataNode.manager,
      Manager_Count__c: dataNode.Manager_Count__c ?? dataNode.managerCount ?? 0,
      
      // Record
      Record__c: !!dataNode.Record__c || !!dataNode.record,
      Record_Count__c: dataNode.Record_Count__c ?? dataNode.recordCount ?? 0,
      
      // CTI
      CTI__c: !!dataNode.CTI__c || !!dataNode.cti,
      CTI_Count__c: dataNode.CTI_Count__c ?? dataNode.ctiCount ?? 0,
      
      // PCI
      PCI__c: !!dataNode.PCI__c || !!dataNode.pci,
      PCI_Count__c: dataNode.PCI_Count__c ?? dataNode.pciCount ?? 0,
      
      // Insights/AI Advisor
      Insights__c: !!dataNode.Insights__c || !!dataNode.insights,
      Insights_Count__c: dataNode.Insights_Count__c ?? dataNode.insightsCount ?? 0,
      AIAdvisor__c: !!dataNode.Insights__c || !!dataNode.insights,
      AIAdvisor_Count__c: dataNode.Insights_Count__c ?? dataNode.insightsCount ?? 0,
      
      // Freedom
      Freedom__c: !!dataNode.Freedom__c || !!dataNode.freedom,
      Freedom_Count__c: dataNode.Freedom_Count__c ?? dataNode.freedomCount ?? 0,
      
      // Service Cloud Voice
      ServiceCloudVoice__c: !!dataNode.SCV__c || !!dataNode.scv,
      ServiceCloudVoice_Count__c: dataNode.SCV_Count__c ?? dataNode.scvCount ?? 0,
      
      // SMS
      SMS__c: !!dataNode.SMS__c || !!dataNode.sms,
      SMS_Count__c: dataNode.SMS_Count__c ?? dataNode.smsCount ?? 0,
      
      // WhatsApp
      WhatsApp__c: !!dataNode.WhatsApp__c || !!dataNode.whatsApp,
      WhatsApp_Count__c: dataNode.WhatsApp_Count__c ?? dataNode.whatsAppCount ?? 0,
      
      // Global
      Numbers__c: !!dataNode.Numbers__c || !!dataNode.numbers,
      Numbers_Count__c: dataNode.Numbers_Count__c ?? dataNode.numbersCount ?? 0,
      Global__c: !!dataNode.Global__c || !!dataNode.global,
      Global_Count__c: dataNode.Global_Count__c ?? dataNode.globalCount ?? 0,
      
      // AI Features
      AIAgents__c: dataNode.AIAgents__c ?? dataNode.aiAgents ?? 0,
      AIAssistants__c: dataNode.AIAssistants__c ?? dataNode.aiAssistants ?? 0,
      AIAgentsCallAllowance__c: dataNode.AIAgentsCallAllowance__c ?? dataNode.aiAgentsCallAllowance ?? 0,
      AIAssistantsCallAllowance__c: dataNode.AIAssistantsCallAllowance__c ?? dataNode.aiAssistantsCallAllowance ?? 0,
      AIAgentsDigitalMessageAllowance__c: dataNode.AIAgentsDigitalMessageAllowance__c ?? dataNode.aiAgentsDigitalMessageAllowance ?? 0,
      AIAssistantsDigitalMessageAllowance__c: dataNode.AIAssistantsDigitalMessageAllowance__c ?? dataNode.aiAssistantsDigitalMessageAllowance ?? 0,
      
      // Provisioning
      AVS_Provisioned__c: !!dataNode.AVS_Provisioned__c || !!dataNode.avsProvisioned,
      TrialExpirationDate__c: dataNode['sfLma__Expiration__c'] || dataNode.trialExpirationDate || undefined,
    };

    return license;
  } catch (error) {
    console.error('[Gatekeeper] Error fetching license:', error);
    return null;
  }
}

/**
 * Check if Call Reporting (CRO) is running
 * CRO doesn't use CronTrigger - it checks if ReportingPolicyId__c is set
 */
export function isCallReportingRunning(): boolean {
  return cachedApiSettings?.ReportingPolicyId__c != null;
}

/**
 * Get ReportingPolicyId from cached API settings
 */
export function getReportingPolicyId(): number | null {
  const policyId = cachedApiSettings?.ReportingPolicyId__c;
  return typeof policyId === 'number' ? policyId : null;
}
