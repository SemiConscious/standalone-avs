// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces

import type { ErrorCode } from '$lib/errors';
import type { PlatformType, SalesforceAuth, DynamicsAuth } from '$lib/platform';

declare global {
  namespace App {
    /**
     * Error structure returned by SvelteKit error responses
     */
    interface Error {
      message: string;
      code?: ErrorCode | string;
      details?: Record<string, unknown>;
    }

    /**
     * Server-side locals available in hooks and load functions
     * 
     * Platform is always set - determined at the edge in hooks.server.ts
     * Platform-specific auth is only present when authenticated
     */
    interface Locals {
      /**
       * Platform type - always set, determined at request edge
       * This is immutable for the entire request lifecycle
       */
      platform: PlatformType;

      /**
       * Salesforce authentication data
       * Only present when platform is 'salesforce' and user is authenticated
       */
      salesforce?: SalesforceAuth;

      /**
       * Dynamics 365 authentication data (future)
       * Only present when platform is 'dynamics' and user is authenticated
       */
      dynamics?: DynamicsAuth;

      // =================================================================
      // Legacy fields - kept for backward compatibility during migration
      // These should be removed once all routes use the new structure
      // =================================================================

      /** @deprecated Use locals.salesforce?.user instead */
      user?: {
        id: string;
        email: string;
        name: string;
        organizationId: string;
      };

      /** @deprecated Use locals.salesforce?.accessToken instead */
      accessToken?: string;

      /** @deprecated Use locals.salesforce?.refreshToken instead */
      refreshToken?: string;

      /** @deprecated Use locals.salesforce?.instanceUrl instead */
      instanceUrl?: string;
    }

    /**
     * Page data available to all pages
     */
    interface PageData {
      /** Current user information if authenticated */
      user?: App.Locals['user'];
      /** Current platform */
      platform?: PlatformType;
      /** Whether in demo mode */
      isDemo?: boolean;
    }

    /**
     * Page state for navigation
     */
    interface PageState {
      /** Previous page for back navigation */
      from?: string;
    }

    // interface Platform {}
  }
}

export {};
