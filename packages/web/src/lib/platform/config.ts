/**
 * Platform Configuration
 * 
 * Defines platform types and their configurations.
 * Platform is determined at the edge (hooks.server.ts) and is immutable for the request.
 */

import { env } from '$env/dynamic/private';

// =============================================================================
// Platform Types
// =============================================================================

/**
 * Supported platform types
 */
export type PlatformType = 'demo' | 'salesforce' | 'dynamics';

/**
 * OAuth configuration for platforms that require authentication
 */
export interface OAuthConfig {
  /** Environment variable name for client ID */
  clientIdEnvVar: string;
  /** Environment variable name for client secret */
  clientSecretEnvVar: string;
  /** Default login URL for OAuth */
  loginUrl: string;
  /** OAuth scopes to request */
  scopes: string[];
}

/**
 * Platform configuration
 */
export interface PlatformConfig {
  /** Platform type identifier */
  type: PlatformType;
  /** Human-readable name */
  name: string;
  /** Whether this platform requires authentication */
  requiresAuth: boolean;
  /** OAuth configuration (only for platforms that require auth) */
  oauth?: OAuthConfig;
  /** Package namespace for Salesforce (if applicable) */
  namespace?: string;
}

// =============================================================================
// Platform Configurations
// =============================================================================

/**
 * Demo platform configuration
 */
export const DEMO_CONFIG: PlatformConfig = {
  type: 'demo',
  name: 'Demo Mode',
  requiresAuth: false,
};

/**
 * Salesforce platform configuration
 */
export const SALESFORCE_CONFIG: PlatformConfig = {
  type: 'salesforce',
  name: 'Salesforce',
  requiresAuth: true,
  oauth: {
    clientIdEnvVar: 'SF_CLIENT_ID',
    clientSecretEnvVar: 'SF_CLIENT_SECRET',
    loginUrl: 'https://login.salesforce.com',
    scopes: ['api', 'refresh_token'],
  },
  namespace: env.SALESFORCE_PACKAGE_NAMESPACE || 'nbavs',
};

/**
 * Dynamics 365 platform configuration (future)
 */
export const DYNAMICS_CONFIG: PlatformConfig = {
  type: 'dynamics',
  name: 'Microsoft Dynamics 365',
  requiresAuth: true,
  oauth: {
    clientIdEnvVar: 'DYNAMICS_CLIENT_ID',
    clientSecretEnvVar: 'DYNAMICS_CLIENT_SECRET',
    loginUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    scopes: ['https://org.crm.dynamics.com/.default', 'offline_access'],
  },
};

/**
 * Map of platform type to configuration
 */
export const PLATFORM_CONFIGS: Record<PlatformType, PlatformConfig> = {
  demo: DEMO_CONFIG,
  salesforce: SALESFORCE_CONFIG,
  dynamics: DYNAMICS_CONFIG,
};

// =============================================================================
// Hostname Mapping
// =============================================================================

/**
 * Hostname patterns for platform detection
 * More specific patterns should come first
 */
const HOSTNAME_PATTERNS: Array<{ pattern: RegExp; platform: PlatformType }> = [
  // Demo mode hostnames
  { pattern: /^demo\./i, platform: 'demo' },
  { pattern: /^demo-/i, platform: 'demo' },
  
  // Dynamics hostnames (future)
  { pattern: /^dynamics\./i, platform: 'dynamics' },
  { pattern: /^d365\./i, platform: 'dynamics' },
  
  // Salesforce hostnames (explicit)
  { pattern: /^sf\./i, platform: 'salesforce' },
  { pattern: /^salesforce\./i, platform: 'salesforce' },
  { pattern: /^app\./i, platform: 'salesforce' },
];

// =============================================================================
// Platform Detection
// =============================================================================

/**
 * Get the platform type from environment variable override
 * Used primarily for local development and testing
 */
export function getPlatformFromEnv(): PlatformType | null {
  const platformMode = env.PLATFORM_MODE?.toLowerCase();
  
  if (platformMode === 'demo') return 'demo';
  if (platformMode === 'salesforce' || platformMode === 'sf') return 'salesforce';
  if (platformMode === 'dynamics' || platformMode === 'd365') return 'dynamics';
  
  // Legacy support for DEMO_MODE env var
  if (env.DEMO_MODE === 'true' || env.DEMO_MODE === '1') return 'demo';
  
  return null;
}

/**
 * Get the platform type from hostname
 */
export function getPlatformFromHostname(hostname: string): PlatformType {
  // Check hostname patterns
  for (const { pattern, platform } of HOSTNAME_PATTERNS) {
    if (pattern.test(hostname)) {
      return platform;
    }
  }
  
  // For localhost, default to salesforce (development mode)
  // This allows local development with Salesforce OAuth
  if (hostname.startsWith('localhost') || hostname.startsWith('127.0.0.1')) {
    return 'salesforce';
  }
  
  // Default to Salesforce for production (most common use case)
  // This handles cases like natterbox.wtf, avs.natterbox.com, etc.
  return 'salesforce';
}

/**
 * Determine the platform for the current request
 * 
 * Priority:
 * 1. PLATFORM_MODE environment variable (for dev/testing)
 * 2. Hostname pattern matching
 * 3. Default to Salesforce
 * 
 * @param hostname - The request hostname
 * @returns Platform configuration
 */
export function determinePlatform(hostname: string): PlatformConfig {
  // Check environment variable override first
  const envPlatform = getPlatformFromEnv();
  if (envPlatform) {
    return PLATFORM_CONFIGS[envPlatform];
  }
  
  // Determine from hostname
  const platformType = getPlatformFromHostname(hostname);
  return PLATFORM_CONFIGS[platformType];
}

/**
 * Get platform configuration by type
 */
export function getPlatformConfig(type: PlatformType): PlatformConfig {
  return PLATFORM_CONFIGS[type];
}

/**
 * Get OAuth credentials for a platform
 * Returns null if not configured or platform doesn't use OAuth
 */
export function getOAuthCredentials(config: PlatformConfig): {
  clientId: string;
  clientSecret: string | undefined;
  loginUrl: string;
  scopes: string[];
} | null {
  if (!config.oauth) return null;
  
  const clientId = env[config.oauth.clientIdEnvVar];
  if (!clientId) {
    console.warn(`OAuth client ID not configured for ${config.name} (${config.oauth.clientIdEnvVar})`);
    return null;
  }
  
  return {
    clientId,
    clientSecret: env[config.oauth.clientSecretEnvVar],
    loginUrl: env.SF_LOGIN_URL || config.oauth.loginUrl,
    scopes: config.oauth.scopes,
  };
}
