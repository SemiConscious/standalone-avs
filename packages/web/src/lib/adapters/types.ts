/**
 * Adapter Types
 * 
 * Common types for the adapter layer.
 * Platform is now determined at the edge in hooks.server.ts.
 */

import { env } from '$env/dynamic/private';
import type { PlatformType } from '$lib/platform';

// =============================================================================
// Platform Types (re-export from platform module)
// =============================================================================

export type Platform = PlatformType;

// =============================================================================
// Adapter Context Types
// =============================================================================

/**
 * Base adapter context - platform-agnostic
 */
export interface BaseAdapterContext {
  /** Platform identifier */
  platform: Platform;
}

/**
 * Salesforce-specific adapter context
 */
export interface SalesforceAdapterContext extends BaseAdapterContext {
  platform: 'salesforce';
  /** Salesforce instance URL */
  instanceUrl: string;
  /** OAuth access token */
  accessToken: string;
  /** Package namespace (e.g., 'nbavs') */
  namespace: string;
}

/**
 * Demo adapter context
 */
export interface DemoAdapterContext extends BaseAdapterContext {
  platform: 'demo';
}

/**
 * Dynamics 365 adapter context (placeholder for future)
 */
export interface DynamicsAdapterContext extends BaseAdapterContext {
  platform: 'dynamics';
  /** Dynamics access token */
  accessToken: string;
  /** Organization URL */
  organizationUrl: string;
}

/**
 * Union type of all adapter contexts
 */
export type AdapterContext = SalesforceAdapterContext | DemoAdapterContext | DynamicsAdapterContext;

// =============================================================================
// Context Guards
// =============================================================================

/**
 * Check if context is for Salesforce
 */
export function isSalesforceContext(ctx: AdapterContext): ctx is SalesforceAdapterContext {
  return ctx.platform === 'salesforce';
}

/**
 * Check if context is for Demo mode
 */
export function isDemoContext(ctx: AdapterContext): ctx is DemoAdapterContext {
  return ctx.platform === 'demo';
}

/**
 * Check if context is for Dynamics
 */
export function isDynamicsContext(ctx: AdapterContext): ctx is DynamicsAdapterContext {
  return ctx.platform === 'dynamics';
}

// =============================================================================
// Context Creation
// =============================================================================

/**
 * Error thrown when platform authentication is missing
 */
export class PlatformAuthError extends Error {
  constructor(platform: Platform) {
    super(`${platform} authentication required but not present`);
    this.name = 'PlatformAuthError';
  }
}

/**
 * Error thrown for unsupported platforms
 */
export class UnsupportedPlatformError extends Error {
  constructor(platform: string) {
    super(`Platform not supported: ${platform}`);
    this.name = 'UnsupportedPlatformError';
  }
}

/**
 * Create an adapter context from SvelteKit locals
 * 
 * Platform is already determined at the edge in hooks.server.ts.
 * This function simply creates the appropriate context type.
 * 
 * @throws {PlatformAuthError} If platform requires auth but not authenticated
 * @throws {UnsupportedPlatformError} If platform is not supported
 */
export function createAdapterContext(locals: App.Locals): AdapterContext {
  switch (locals.platform) {
    case 'demo':
      return { platform: 'demo' };

    case 'salesforce': {
      // Salesforce requires authentication
      if (!locals.salesforce) {
        // Fall back to legacy fields for backward compatibility
        if (locals.accessToken && locals.instanceUrl) {
          return {
            platform: 'salesforce',
            instanceUrl: locals.instanceUrl,
            accessToken: locals.accessToken,
            namespace: env.SALESFORCE_PACKAGE_NAMESPACE || 'nbavs',
          };
        }
        throw new PlatformAuthError('salesforce');
      }

      return {
        platform: 'salesforce',
        instanceUrl: locals.salesforce.instanceUrl,
        accessToken: locals.salesforce.accessToken,
        namespace: env.SALESFORCE_PACKAGE_NAMESPACE || 'nbavs',
      };
    }

    case 'dynamics': {
      // Dynamics requires authentication
      if (!locals.dynamics) {
        throw new PlatformAuthError('dynamics');
      }

      return {
        platform: 'dynamics',
        accessToken: locals.dynamics.accessToken,
        organizationUrl: locals.dynamics.organizationUrl,
      };
    }

    default:
      throw new UnsupportedPlatformError(locals.platform);
  }
}

/**
 * Create a Salesforce adapter context directly
 * Useful for server-side operations where locals aren't available
 */
export function createSalesforceContext(
  instanceUrl: string,
  accessToken: string,
  namespace?: string
): SalesforceAdapterContext {
  return {
    platform: 'salesforce',
    instanceUrl,
    accessToken,
    namespace: namespace || env.SALESFORCE_PACKAGE_NAMESPACE || 'nbavs',
  };
}

/**
 * Create a demo adapter context
 */
export function createDemoContext(): DemoAdapterContext {
  return { platform: 'demo' };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if we're in demo mode based on locals
 * This is now determined at the edge, so we just check the platform
 */
export function isDemoMode(locals: App.Locals): boolean {
  return locals.platform === 'demo';
}

/**
 * Check if we have valid Salesforce credentials
 * @deprecated Use locals.salesforce check instead
 */
export function hasValidSalesforceCredentials(locals: App.Locals): boolean {
  return !!(locals.salesforce?.accessToken && locals.salesforce?.instanceUrl) ||
         !!(locals.accessToken && locals.instanceUrl);
}
